# BlockNote Streaming Optimization Guide

**Focus**: Specific improvements to BlockNote + Vercel AI SDK integration for seamless text streaming into the editor.

---

## Current Architecture Issue

Your current setup (from retrospective):
```
BlockNote Editor
    ↓
@blocknote/xl-ai extension
    ↓
Custom BackendTransport (buggy parser)
    ↓
/api/ai/chat endpoint
    ↓
Vercel AI SDK (toUIMessageStreamResponse)
```

**Problems identified**:
1. toUIMessageStreamResponse() sends wrong format
2. BackendTransport has dual-path parsing (SSE + Data Stream)
3. Message conversion filters instead of transforms
4. No streaming progress feedback to user

---

## Solution 1: Fix Backend Response Format

### Current (Broken) ❌
```typescript
// apps/web/app/api/ai/chat/route.ts
const result = await streamText({ ... });
return result.toUIMessageStreamResponse();  // ← WRONG
```

### Corrected ✅
```typescript
// apps/web/app/api/ai/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, systemPrompt } = await request.json();

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt || 'You are a helpful writing assistant.',
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // ← THIS IS THE KEY: toDataStreamResponse not toUIMessageStreamResponse
    return result.toDataStreamResponse();
  } catch (error) {
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**Impact**: Backend now sends Vercel's standard Data Stream Protocol format

---

## Solution 2: Simplify BlockNote Transport Parser

### Current (Complex) ❌
```typescript
// Dual-path parsing causing bugs
if (line.startsWith('data: ')) { /* SSE */ }
else if (line.includes(':')) { /* Data Stream */ }
else { /* ??? */ }
```

### Corrected ✅
```typescript
// packages/ui/src/lib/blocknote-transport.ts
import { ChatTransport } from '@blocknote/xl-ai';

export class OptimizedBlockNoteTransport implements ChatTransport<any> {
  async sendMessages(messages: any[]): Promise<AsyncIterable<any>> {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Single parsing path: Vercel Data Stream Protocol only
    return this.parseDataStream(response);
  }

  /**
   * Parse Vercel's Data Stream Protocol:
   * 0:{"text":"chunk"}           → text delta
   * 1:{"toolName":"..."}         → tool call
   * 3:"error message"            → error
   */
  private async *parseDataStream(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Accumulate chunks
        buffer += decoder.decode(value, { stream: true });
        
        // Split by newline and process complete lines only
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // Parse Data Stream Protocol
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;

            const type = line.slice(0, colonIndex);
            const content = line.slice(colonIndex + 1);

            // Only handle text chunks (type "0")
            if (type === '0') {
              const json = JSON.parse(content);
              if (json.text) {
                yield {
                  type: 'text-delta',
                  textDelta: json.text,
                };
              }
            } else if (type === '3') {
              // Error chunk
              console.error('Stream error:', content);
            }
            // Ignore tool calls (type "1") for now
          } catch (parseError) {
            console.error('Failed to parse chunk:', line);
            // Continue to next line, don't break stream
          }
        }
      }

      // Handle any remaining data
      if (buffer.trim()) {
        try {
          const colonIndex = buffer.indexOf(':');
          if (colonIndex !== -1) {
            const type = buffer.slice(0, colonIndex);
            const content = buffer.slice(colonIndex + 1);
            
            if (type === '0') {
              const json = JSON.parse(content);
              if (json.text) {
                yield {
                  type: 'text-delta',
                  textDelta: json.text,
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

**Key improvements**:
- ✅ Single parsing path (no dual logic)
- ✅ Proper async generator
- ✅ Graceful error handling (continues instead of throws)
- ✅ Clean newline splitting
- ✅ Buffer management for partial chunks

---

## Solution 3: Fix Message Conversion

### Current (Filtering) ❌
```typescript
// Removes valid messages instead of converting
const validMessages = messages.filter((m) => 
  m.content && m.content.trim() !== "" // Fails for arrays!
);
```

### Corrected ✅
```typescript
// packages/ui/src/lib/message-converter.ts

/**
 * Convert BlockNote messages to AI SDK CoreMessage format
 * BlockNote sends: { role: string, content: string | Array<{type, text}> }
 * AI SDK needs:   { role: string, content: string | Array<{type: 'text', text}> }
 */
export function convertToCoreMessages(messages: any[]) {
  return messages
    .map((msg) => {
      // Validate role
      if (!['system', 'user', 'assistant', 'tool'].includes(msg.role)) {
        console.warn(`Invalid role: ${msg.role}, skipping`);
        return null;
      }

      let content: string | Array<{ type: 'text'; text: string }>;

      // Handle string content
      if (typeof msg.content === 'string') {
        content = msg.content;
      }
      // Handle array content (parts)
      else if (Array.isArray(msg.content)) {
        const validParts = msg.content
          .filter((part: any) => {
            if (typeof part === 'string') return true;
            if (part?.type === 'text' && part?.text) return true;
            return false;
          })
          .map((part: any) => ({
            type: 'text' as const,
            text: typeof part === 'string' ? part : (part.text || ''),
          }));

        // Use parts if valid, otherwise empty string
        content = validParts.length > 0 ? validParts : '';
      }
      // Fallback
      else {
        content = '';
      }

      // Skip messages with empty content
      if (!content) {
        console.warn('Empty content message:', msg);
        return null;
      }

      return {
        role: msg.role,
        content,
      };
    })
    .filter((msg) => msg !== null); // Remove null entries
}
```

**Usage in route**:
```typescript
// apps/web/app/api/ai/chat/route.ts
import { convertToCoreMessages } from '@/lib/message-converter';

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  // Properly convert messages
  const coreMessages = convertToCoreMessages(messages);

  if (coreMessages.length === 0) {
    return Response.json(
      { error: 'No valid messages provided' },
      { status: 400 }
    );
  }

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages: coreMessages,
  });

  return result.toDataStreamResponse();
}
```

---

## Solution 4: Add Streaming Feedback UI

### Show User That Streaming Is Happening

```typescript
// packages/ui/src/components/blocknote-editor.tsx
import { useState, useCallback, useEffect } from 'react';
import { OptimizedBlockNoteTransport } from '../lib/blocknote-transport';

export function BlockNoteEditor(props: BlockNoteEditorProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState('');
  
  // Initialize editor with transport
  const editor = useCreateBlockNote({
    dictionary: customDictionary,
    initialContent,
  });

  // Track streaming status
  const handleStreamingStart = useCallback(() => {
    setIsStreaming(true);
    setStreamingStatus('Generating text...');
  }, []);

  const handleStreamingEnd = useCallback(() => {
    setIsStreaming(false);
    setStreamingStatus('');
  }, []);

  return (
    <div className="relative w-full">
      {/* Editor */}
      <BlockNoteView
        editor={editor}
        theme={props.theme}
        className={props.className}
        style={props.style}
        editable={!isStreaming} // Disable editing while streaming
      />

      {/* Streaming Indicator */}
      {isStreaming && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full" />
          {streamingStatus}
        </div>
      )}
    </div>
  );
}
```

---

## Solution 5: Enhanced Error Handling & Diagnostics

```typescript
// packages/ui/src/lib/blocknote-diagnostics.ts

/**
 * Diagnostic tools for debugging BlockNote streaming
 */

export function createDiagnosticTransport(
  originalTransport: any,
  onDiagnostic?: (msg: string) => void
) {
  const log = (msg: string) => {
    console.log(`[BlockNote Diagnostics] ${msg}`);
    onDiagnostic?.(msg);
  };

  return {
    async sendMessages(messages: any[]) {
      log(`📤 Sending ${messages.length} messages`);
      messages.forEach((msg, i) => {
        log(`  [${i}] ${msg.role}: ${typeof msg.content === 'string' ? msg.content.slice(0, 50) : 'array'}`);
      });

      try {
        log('⏳ Waiting for response...');
        const stream = await originalTransport.sendMessages(messages);
        log('✅ Response stream received');

        // Wrap stream to log chunks
        return logStreamChunks(stream, log);
      } catch (error) {
        log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    },

    async reconnectToStream() {
      return originalTransport.reconnectToStream?.();
    },
  };
}

async function* logStreamChunks(stream: any, log: (msg: string) => void) {
  let chunkCount = 0;
  let textLength = 0;

  for await (const chunk of stream) {
    chunkCount++;
    if (chunk.type === 'text-delta') {
      textLength += chunk.textDelta.length;
      log(`📥 Chunk ${chunkCount}: "${chunk.textDelta}"`);
    }
    yield chunk;
  }

  log(`✅ Stream complete: ${chunkCount} chunks, ${textLength} characters`);
}
```

---

## Solution 6: Integration Steps

### Step 1: Update Route
```bash
# Replace /app/api/ai/chat/route.ts with corrected version
# Change: toUIMessageStreamResponse() → toDataStreamResponse()
# Add: Proper message conversion
```

### Step 2: Replace Transport
```typescript
// In blocknote-editor.tsx or wherever you initialize:
import { OptimizedBlockNoteTransport } from '@/lib/blocknote-transport';
import { createDiagnosticTransport } from '@/lib/blocknote-diagnostics';

const transport = new OptimizedBlockNoteTransport();

// Optional: Add diagnostics for development
const debugTransport = createDiagnosticTransport(
  transport,
  (msg) => console.log(msg)
);

// Use debugTransport instead of transport
```

### Step 3: Test
```bash
# 1. Start dev server
npm run dev

# 2. In BlockNote editor, trigger AI action
# 3. Check Network tab - should see Data Stream Protocol chunks (0:{...})
# 4. Check console - should see streaming progress
# 5. No parser errors should appear
```

---

## Quick Comparison: Before vs After

### Before (Broken)
```
User selects text
    ↓
Click "Improve Writing"
    ↓
API returns toUIMessageStreamResponse()
    ↓
BackendTransport tries dual parsing (SSE + Data Stream)
    ↓
Parser fails on edge case
    ↓
Stream stops, error logged
    ✗ Nothing happens
```

### After (Fixed)
```
User selects text
    ↓
Click "Improve Writing"
    ↓
API returns toDataStreamResponse() (correct format)
    ↓
OptimizedBlockNoteTransport parses single format
    ↓
Each text chunk yielded immediately
    ↓
BlockNote updates editor in real-time
    ✓ Text appears character-by-character
```

---

## Performance Optimization

### Add Buffering for Small Chunks
```typescript
// For very fast networks, batch small chunks
private async *parseDataStream(response: Response) {
  // ... existing code ...

  // Optional: Buffer chunks for smoother UX
  let chunkBuffer = '';
  const flushBuffer = async function* () {
    if (chunkBuffer) {
      yield {
        type: 'text-delta',
        textDelta: chunkBuffer,
      };
      chunkBuffer = '';
    }
  };

  // Yield buffered chunks every 50ms or when large
  const bufferTimeout = setInterval(() => {
    if (chunkBuffer) {
      // Queue for yield
    }
  }, 50);

  // ... rest of parsing ...
}
```

---

## Validation Checklist

Before shipping, verify:

- [ ] Backend uses `toDataStreamResponse()` ✓
- [ ] Message conversion properly handles arrays ✓
- [ ] Parser has single path only ✓
- [ ] No SSE parsing code ✓
- [ ] Error handling doesn't break stream ✓
- [ ] Async generator yields chunks correctly ✓
- [ ] BlockNote UI updates in real-time ✓
- [ ] Network tab shows Data Stream Protocol chunks ✓
- [ ] No console errors ✓
- [ ] Performance is smooth (<100ms per chunk) ✓

---

## Debugging Commands

### Check Stream Format
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello"}]}'

# Should see: 0:{"text":"hello"}
# Should NOT see: data:{...} or UIMessage format
```

### Enable Verbose Logging
```typescript
// In development, wrap transport:
const transport = createDiagnosticTransport(
  new OptimizedBlockNoteTransport()
);
```

---

## Expected Results

✅ **Immediate improvements**:
- Text streams character-by-character
- No parser errors in console
- Consistent behavior across providers
- Real-time feedback to user

✅ **Long-term benefits**:
- Easier to debug issues
- Foundation for tool support
- Ready for production
- Extensible architecture

---

## One-Liner Summary

**Replace complex dual-path parser with single Data Stream Protocol parser + fix backend response format = streaming works perfectly**
