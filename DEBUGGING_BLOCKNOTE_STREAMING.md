# Debugging BlockNote AI Streaming

## Current Status

✅ **Stream is working correctly:**
- Chunks are being received from backend
- Chunks are being parsed correctly (delta → textDelta conversion)
- Chunks are being dequeued and enqueued to the ReadableStream controller
- `pull()` is being called by BlockNote
- No errors in our transport layer

❌ **UI is not updating:**
- Text deltas are not appearing in the editor
- This suggests BlockNote's internal processing might be failing silently

## How BlockNote Processes Streams

Based on the source code analysis:

1. **AIExtension** (`AIExtension.ts`) creates a `Chat<UIMessage>` object from `@ai-sdk/react`
2. **Chat** class processes the `ReadableStream<UIMessageChunk>` from our transport
3. **executeAIRequest** (`execute.ts`) calls `setupToolCallStreaming` which processes tool calls
4. The Chat class internally processes text deltas and updates the UI

## How to Check for BlockNote Internal Errors

### Method 1: Check Browser Console for Errors

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors that mention:
   - `Chat`
   - `process-ui-message-stream`
   - `AIExtension`
   - `chat.ts`
   - Any errors from `@ai-sdk/react` or `@blocknote/xl-ai`

### Method 2: Add Error Listeners in blocknote-editor.tsx

Add this code to catch errors from BlockNote's Chat object:

```typescript
// In blocknote-editor.tsx, after creating the aiExtension
const aiExtension = createAIExtension({
    transport: new BackendTransport({...}),
});

// After editor is created, add error listeners
if (editor) {
    const aiExt = editor.extension('ai');
    if (aiExt) {
        // Listen to store changes to catch errors
        aiExt.store.subscribe((state) => {
            if (state.aiMenuState !== 'closed' && 'error' in state.aiMenuState) {
                console.error('❌ BlockNote AI Error:', state.aiMenuState.error);
            }
        });
    }
}
```

### Method 3: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Look for the `/api/ai/chat` request
4. Check if the response stream is being consumed
5. Look for any failed requests or errors

### Method 4: Add Breakpoints

Add breakpoints in:
- `packages/ui/src/lib/backend-transport.ts` line 277 (where we enqueue chunks)
- Check if chunks are actually being read by BlockNote

## Potential Issues Found

### Issue 1: Chunk Structure
Our chunks have the correct structure:
- ✅ `type: 'text-delta'`
- ✅ `textDelta: string` (not `delta`)
- ✅ `id: string`
- ✅ `providerMetadata` (when present)

### Issue 2: Stream Format
The stream format matches what BlockNote expects based on `ClientSideTransport.ts`:
- Returns `ReadableStream<UIMessageChunk>`
- Uses `pull()` method for lazy consumption
- Properly handles control chunks (`start`, `text-start`, `text-end`, `finish`)

### Issue 3: Possible BlockNote Bug
Looking at `AIExtension.ts` line 465, there's error handling that might be swallowing errors:
```typescript
} catch (e) {
    this.setAIResponseStatus({
        status: "error",
        error: e,
    });
    console.warn("Error calling LLM", e, this.chatSession?.chat.messages);
}
```

The error is logged with `console.warn`, so check for warnings in the console.

## Next Steps

1. **Check console for warnings** - Look for `"Error calling LLM"` warnings
2. **Check the Chat object** - The Chat class from `@ai-sdk/react` might be having issues processing our stream
3. **Verify chunk format** - Double-check that chunks match exactly what BlockNote expects
4. **Test with BlockNote's DefaultChatTransport** - Try using BlockNote's default transport to see if the issue is with our custom transport

## Files to Check

- `/packages/ui/node_modules/@blocknote/xl-ai/src/AIExtension.ts` - Main AI extension
- `/packages/ui/node_modules/@blocknote/xl-ai/src/api/aiRequest/execute.ts` - Request execution
- `/packages/ui/node_modules/@blocknote/xl-ai/src/streamTool/vercelAiSdk/clientside/ClientSideTransport.ts` - Reference transport implementation

## Key Finding

The `Chat` class from `@ai-sdk/react` is responsible for processing the stream and updating the UI. If chunks are being enqueued correctly but the UI isn't updating, the issue is likely in how the Chat class is consuming or processing the stream.

Check the Chat object's internal state by logging:
```typescript
console.log('Chat status:', chat.status);
console.log('Chat messages:', chat.messages);
console.log('Chat error:', chat.error);
```

