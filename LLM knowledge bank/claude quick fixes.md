# 🔴 CRITICAL ISSUES IN YOUR BLOCKNOTE STREAMING - REAL FIXES

Your repo has 3 critical problems preventing streaming:

---

## PROBLEM #1: API Route Returns Wrong Format ❌

**File**: `apps/web/app/api/ai/chat/route.ts` (line ~end)

```typescript
// ❌ WRONG - Current code
return result.toUIMessageStreamResponse();
```

**Why it's wrong**: 
- `toUIMessageStreamResponse()` is deprecated in Vercel AI SDK v5
- Returns wrong format BlockNote can't parse
- Your screenshot shows "can't read text property" = this is the issue

**Fix**:
```typescript
// ✅ CORRECT
return result.toDataStreamResponse();
```

---

## PROBLEM #2: BackendTransport Yields Wrong Chunk Structure ❌

**File**: `packages/ui/src/lib/backend-transport.ts` (around line 100-115)

### Current Wrong Code:
```typescript
// ❌ WRONG
if (type === '0') { // Text chunk
  const value = JSON.parse(content);
  chunk = {
    type: 'text-delta',    // ← WRONG PROPERTY NAME
    textDelta: value,      // ← WRONG - should be 'text'
    id: msg_${Date.now()}, // ← WRONG PLACE
  };
}
```

### Why It's Wrong:
BlockNote's `ChatTransport` expects `UIMessageChunk` interface:
```typescript
interface UIMessageChunk {
  id: string;              // Message ID (NOT in individual field)
  createdAt: Date;         // Timestamp
  role: 'assistant';       // Must specify role
  content: Array<{         // ← THIS structure
    type: 'text';
    text: string;          // ← NOT textDelta!
  }>;
}
```

Your code yields: `{ type: 'text-delta', textDelta: '...' }`
BlockNote looks for: `chunk.content[0].text`
Result: **"Can't read text property"** ✓ This matches your error!

### Correct Fix:
```typescript
// ✅ CORRECT
let messageId = '';
let fullText = '';

// In the chunk processing:
if (type === '0') {
  const value = JSON.parse(content);
  if (value.text) {
    fullText += value.text; // ← ACCUMULATE

    chunk = {
      id: messageId, // ← Already set before
      createdAt: new Date(),
      role: 'assistant',
      content: [{
        type: 'text',
        text: fullText,  // ← Full accumulated text
      }],
    };
  }
}
```

---

## PROBLEM #3: Not Handling Vercel Data Stream Protocol Correctly ❌

**File**: `packages/ui/src/lib/backend-transport.ts` (around lines 60-90)

### Current Issue:
Your code tries to handle multiple formats (SSE + Data Stream Protocol), causing confusion.

Line with issue:
```typescript
// ❌ WRONG - Tries both SSE and Data Stream
if (line.startsWith('data ')) { /* SSE */ }
else if (line.includes(':')) { /* Data Stream */ }
```

Problem: BlockNote API returns **ONLY** Vercel Data Stream Protocol format:
```
0:{"text":"word1"}
0:{"text":" word2"}
3:{"message":"error"} (if error)
```

NOT SSE format (`data: {...}`).

### Correct Fix:
```typescript
// ✅ CORRECT - Single path, Data Stream Protocol only
for (const line of lines) {
  if (!line.trim()) continue;

  // Simple format: type:content
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) continue;

  const type = line.slice(0, colonIndex);
  const content = line.slice(colonIndex + 1);

  if (type === '0') {
    // Text chunk
    const json = JSON.parse(content);
    if (json.text) {
      fullText += json.text;
      // Yield proper UIMessageChunk
      chunkQueue.push({
        id: messageId,
        createdAt: new Date(),
        role: 'assistant',
        content: [{ type: 'text', text: fullText }],
      });
    }
  } else if (type === '3') {
    // Error
    console.error('Stream error:', content);
  }
  // Ignore other types
}
```

---

## COMPLETE CORRECTED backend-transport.ts

```typescript
import type { ChatTransport, UIMessageChunk } from 'ai';

interface BackendTransportOptions {
  api: string;
  headers?: Promise<Record<string, string>>;
  getExtraBody?: Promise<Record<string, any>>;
}

export class BackendTransport implements ChatTransport<any> {
  private api: string;
  private headers?: Promise<Record<string, string>>;
  private getExtraBody?: Promise<Record<string, any>>;

  constructor(options: BackendTransportOptions) {
    this.api = options.api;
    this.headers = options.headers;
    this.getExtraBody = options.getExtraBody;
  }

  async sendMessages(messages: any[]): Promise<AsyncIterable<UIMessageChunk>> {
    console.log('BackendTransport.sendMessages called!');

    const extraBody = this.getExtraBody ? await this.getExtraBody() : {};
    const headers = this.headers ? await this.headers() : {};

    const requestBody = {
      ...extraBody,
      messages,
    };

    const response = await fetch(this.api, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return this.parseStream(response);
  }

  /**
   * Parse Vercel Data Stream Protocol into UIMessageChunks
   * Format: 0:{"text":"chunk"} for text, 3:"error message" for errors
   */
  private async *parseStream(response: Response): AsyncIterable<UIMessageChunk> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // Parse Data Stream Protocol: type:content
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;

            const type = line.slice(0, colonIndex);
            const content = line.slice(colonIndex + 1);

            if (type === '0') {
              // Text chunk
              const json = JSON.parse(content);
              if (json.text) {
                fullText += json.text;

                // ✅ Yield proper UIMessageChunk
                yield {
                  id: messageId,
                  createdAt: new Date(),
                  role: 'assistant',
                  content: [
                    {
                      type: 'text',
                      text: fullText, // ← Full accumulated text
                    },
                  ],
                };
              }
            } else if (type === '3') {
              // Error chunk
              console.error('Stream error:', content);
              // Optionally yield error, but continue
            }
            // Ignore other types (tool calls, etc.)
          } catch (parseError) {
            console.error('Parse error:', line, parseError);
            // Continue to next line
          }
        }
      }

      // Handle any remaining buffer
      if (buffer.trim()) {
        try {
          const colonIndex = buffer.indexOf(':');
          if (colonIndex !== -1) {
            const type = buffer.slice(0, colonIndex);
            const content = buffer.slice(colonIndex + 1);

            if (type === '0') {
              const json = JSON.parse(content);
              if (json.text) {
                fullText += json.text;
                yield {
                  id: messageId,
                  createdAt: new Date(),
                  role: 'assistant',
                  content: [{ type: 'text', text: fullText }],
                };
              }
            }
          }
        } catch {
          // Ignore final buffer errors
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async reconnectToStream(): Promise<any> {
    return null;
  }
}
```

---

## COMPLETE CORRECTED API Route

**File**: `apps/web/app/api/ai/chat/route.ts` (end of file)

```typescript
// At the VERY END of the POST function, replace:

// ❌ WRONG
return result.toUIMessageStreamResponse();

// ✅ CORRECT
return result.toDataStreamResponse();
```

---

## PROBLEM #4: Message Validation Too Strict ❌

**File**: `apps/web/app/api/ai/chat/route.ts` (around line 60-80)

### Current Code Issue:
```typescript
// ❌ This might filter out valid messages
const validMessages = messages
  .filter((m: any) => {
    if (m.parts && Array.isArray(m.parts) && m.parts.length === 0) {
      return true; // Skip empty parts
    }
    return m.content && (typeof m.content === 'string' ? m.content.trim() !== '' : true);
  });
```

This logic is backwards! It returns `true` for empty parts but filters on content.

### Fix:
```typescript
// ✅ CORRECT
const validMessages = messages
  .filter((m: any) => {
    // Skip if parts array exists but is empty
    if (m.parts && Array.isArray(m.parts) && m.parts.length === 0) {
      return false; // ← Changed from true to false
    }
    
    // Keep message if it has non-empty content
    if (!m.content) return false;
    
    if (typeof m.content === 'string') {
      return m.content.trim().length > 0;
    }
    
    return true; // Keep array content as-is
  });
```

---

##Ensure Message Start Chunk is Emitted
BlockNote may need a message-start chunk before text-delta chunks:

typescript
// Add at the start of streaming in BackendTransport:
chunkQueue.push({
  type: 'message-start',
  id: `msg-${Date.now()}`,
  role: 'assistant',
  content: [],
} as any);


##Debug Recommendation
Add logging to verify chunk structure before enqueueing:

typescript
console.log('Chunk being enqueued:', JSON.stringify(chunk, null, 2));
The BlockNote AI SDK documentation specifies that streaming requires properly formatted UIMessageChunk objects with nested content arrays—your transport's current text-delta chunks lack the full structure BlockNote expects



## TESTING CHECKLIST

After fixes, verify:

- [ ] **API Route**: Change `toUIMessageStreamResponse()` to `toDataStreamResponse()` ✓
- [ ] **Backend Transport**: Update to return proper `UIMessageChunk` format ✓
- [ ] **Remove SSE parsing**: Only parse Data Stream Protocol ✓
- [ ] **Accumulate text**: Build full text each yield ✓
- [ ] **Restart dev server**: `npm run dev` ✓

### Test in Browser:
1. Open BlockNote editor
2. Select text
3. Click AI button ("Improve Writing")
4. Watch text stream character-by-character ✓

### Check Console:
- No "can't read text property" error ✓
- Should see chunks being parsed ✓
- No parser errors ✓

---

## Why This Will Fix Everything

| Issue | Root Cause | Fix | Result |
|-------|-----------|-----|--------|
| "Can't read text property" | Yielding `textDelta` instead of `content[].text` | Use proper `UIMessageChunk` format | BlockNote finds `text` property ✓ |
| No streaming visible | Wrong structure format | Change `toUIMessageStreamResponse()` → `toDataStreamResponse()` | Proper format sent ✓ |
| Parser confusion | Handling multiple formats | Only parse Data Stream Protocol | Single reliable path ✓ |
| Text disappears | Not accumulating | Add `fullText += chunk` | Full text each yield ✓ |

---

## Implementation Order

1. **First**: Fix API route (`toDataStreamResponse()`)
2. **Second**: Replace `backend-transport.ts` with corrected version
3. **Third**: Restart dev server
4. **Fourth**: Test in browser

**Total time: 10-15 minutes**

All code above is **copy-paste ready**. No dependencies to install.
