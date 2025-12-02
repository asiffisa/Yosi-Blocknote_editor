# BlockNote Streaming: 3-Step Fix

## The Problem (What You Have Now)

```
❌ toUIMessageStreamResponse()     → Wrong format
❌ Dual-path parser                → Fails on edge cases
❌ Message filtering               → Removes valid messages
❌ No user feedback                → Silent failures
```

**Result**: Text doesn't stream into BlockNote editor

---

## The Solution (3 Files to Fix)

### FIX #1: Backend Route (5 min)

**File**: `apps/web/app/api/ai/chat/route.ts`

```typescript
// Change this line:
return result.toUIMessageStreamResponse();  // ❌ WRONG

// To this:
return result.toDataStreamResponse();       // ✅ CORRECT
```

**Plus**: Proper message conversion
```typescript
const coreMessages = messages.map((msg: any) => ({
  role: msg.role,
  content: msg.content,
}));
```

**Why**: Sends Vercel's standard Data Stream Protocol format that BlockNote expects

---

### FIX #2: BlockNote Transport (10 min)

**File**: `packages/ui/src/lib/blocknote-transport.ts` (new file)

Key changes:
- ✅ Single parsing path (no dual SSE + Data Stream logic)
- ✅ Proper async generator
- ✅ Errors don't break stream

```typescript
export class OptimizedBlockNoteTransport implements ChatTransport<any> {
  // Single path: only Data Stream Protocol
  // Format: 0:{"text":"..."} for text chunks
  // Yields: { type: 'text-delta', textDelta: string }
}
```

**Why**: No more ambiguous edge cases, reliable streaming

---

### FIX #3: Message Converter (5 min)

**File**: `packages/ui/src/lib/message-converter.ts` (new file)

```typescript
export function convertToCoreMessages(messages: any[]) {
  return messages
    .map((msg) => ({
      role: msg.role,
      // Properly convert: string OR array of {type:'text', text:...}
      content: typeof msg.content === 'string'
        ? msg.content
        : msg.content.map((part: any) => ({
            type: 'text',
            text: part.text || ''
          }))
    }))
    .filter((msg) => msg.content); // Remove empties
}
```

**Why**: Actually converts format instead of filtering out valid messages

---

## Before & After

### Before (❌ Broken)
```
Select text in BlockNote
    ↓
Click "Improve"
    ↓
API sends toUIMessageStreamResponse()
    ↓
Parser tries SSE parsing
    ↓
Tries Data Stream parsing
    ↓
Edge case hits
    ↓
❌ Stream stops, nothing appears
```

### After (✅ Working)
```
Select text in BlockNote
    ↓
Click "Improve"
    ↓
API sends toDataStreamResponse()
    ↓
Parser: single path (Data Stream Protocol)
    ↓
Each chunk: 0:{"text":"word"}
    ↓
Yields to BlockNote
    ↓
✅ Text appears character-by-character
```

---

## 15-Minute Implementation

### Step 1: Fix Route (5 min)
1. Open `apps/web/app/api/ai/chat/route.ts`
2. Change `toUIMessageStreamResponse()` → `toDataStreamResponse()`
3. Add message conversion function
4. Test with curl

### Step 2: Create Transport (10 min)
1. Create `packages/ui/src/lib/blocknote-transport.ts`
2. Copy `OptimizedBlockNoteTransport` code from blocknote-streaming-focused.md
3. Add to exports in `index.tsx`
4. Use in BlockNote editor component

### Step 3: Test (Verify)
```bash
# Terminal: Check API format
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello"}]}'

# Should see: 0:{"text":"hello"} format ✓

# Browser: Test streaming
# Select text → Click AI tool → Watch text appear ✓
```

---

## Copy-Paste Code

### `apps/web/app/api/ai/chat/route.ts`
[See blocknote-streaming-focused.md - Solution 1]

### `packages/ui/src/lib/blocknote-transport.ts`
[See blocknote-streaming-focused.md - Solution 2]

### `packages/ui/src/lib/message-converter.ts`
[See blocknote-streaming-focused.md - Solution 3]

---

## Validation

After changes, check:

- [ ] API returns Data Stream Protocol (0: format)
- [ ] Parser has single path only
- [ ] Message converter handles arrays
- [ ] Text streams in real-time
- [ ] No console errors
- [ ] BlockNote updates while streaming

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "toDataStreamResponse is not a function" | Update ai SDK: `npm install ai@latest` |
| "Parse error" in console | Verify API returns `0:{...}` format |
| Text not appearing | Check BlockNote actually calling `/api/ai/chat` |
| Slow streaming | Check network latency in DevTools |
| "Cannot find ChatTransport" | Ensure @blocknote/xl-ai is installed |

---

## That's It!

**3 changes = Streaming works**

1. Backend: `toDataStreamResponse()`
2. Transport: Single parser path
3. Messages: Proper conversion

All code ready to copy-paste in `blocknote-streaming-focused.md`

**Time to fix: 15-30 minutes**
**Impact: Fully working streaming**
