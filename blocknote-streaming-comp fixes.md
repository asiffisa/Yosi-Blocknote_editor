# BlockNote Streaming Deep Review & Complete Fix Guide

**Status:** Critical - Streaming completely broken  
**Root Cause:** Multiple protocol mismatches + missing AI extension + incorrect response format  
**Time to Fix:** 20-30 minutes  
**Difficulty:** Medium (copy-paste ready solutions)

---

## 📊 Executive Summary

Your BlockNote editor cannot stream AI responses because:

1. **API returns wrong format** - Using deprecated `toUIMessageStreamResponse` instead of `toDataStreamResponse`
2. **Backend transport yields wrong structure** - Chunks lack required `content` array and use wrong field names
3. **Missing AI extension** - `@blocknote/xl-ai` not imported/initialized, so no transport is active
4. **Protocol mismatch** - Backend sends Vercel Data Stream Protocol (lines like `0:{"text":"word"}`), but transport doesn't parse correctly
5. **No document context** - Backend doesn't inject BlockNote's document state into AI prompts

This guide provides fixes for all issues plus debugging steps.

---

## 🔴 Critical Issues Found

### Issue 1: API Route Returns Wrong Format

**File:** `apps/web/app/api/ai/chat/route.ts`  
**Line:** End of POST function (around line 150-160)

**Current (WRONG):**
```typescript
return result.toUIMessageStreamResponse
// or custom ReadableStream construction
```

**Problem:** 
- `toUIMessageStreamResponse` is deprecated in Vercel AI SDK v5
- Returns old message format that BlockNote can't parse
- Result: No streaming output visible

**Fix:**
```typescript
return result.toDataStreamResponse()
```

This returns Vercel's Data Stream Protocol format: lines like `0:{"text":"hello"}`, `0:{"text":" world"}`, etc.

---

### Issue 2: Backend Transport Yields Wrong Chunk Structure

**File:** `packages/ui/src/lib/backend-transport.ts`  
**Lines:** 100-120 (chunk parsing)

**Current (WRONG):**
```typescript
if (type === "0") { // text chunk
  const value = JSON.parse(content);
  yield {
    type: "text-delta",           // ❌ WRONG - should not be here
    textDelta: value.text,        // ❌ WRONG field name - should be `text`
    id: msg,                      // ❌ WRONG structure
    role: "assistant",
    createdAt: new Date(),
  };
}
```

**Why It's Wrong:**

BlockNote's `ChatTransport` interface expects `UIMessageChunk`:
```typescript
interface UIMessageChunk {
  id: string;                    // Message ID
  role: "assistant" | "user";
  createdAt: Date;
  content: Array<{               // ← REQUIRED ARRAY
    type: "text";
    text: string;                // ← Full accumulated text (not delta!)
  }>;
}
```

Your code yields:
```typescript
{
  type: "text-delta",            // ← BlockNote looks for `content` array instead
  textDelta: "word",             // ← BlockNote looks for `content[0].text` → undefined
}
```

**Result:** `Cannot read property 'text' of undefined` error

**Fix:**
```typescript
let messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
let fullText = ""; // Accumulate entire text

if (type === "0") {
  const json = JSON.parse(content);
  if (json.text) {
    fullText += json.text;  // ← ACCUMULATE
    yield {
      id: messageId,
      createdAt: new Date(),
      role: "assistant",
      content: [
        {
          type: "text",
          text: fullText,  // ← FULL TEXT, not delta
        },
      ],
    };
  }
}
```

---

### Issue 3: Transport Has Dual-Path Parser (SSE + Data Stream)

**File:** `packages/ui/src/lib/backend-transport.ts`  
**Lines:** 80-100

**Current (WRONG):**
```typescript
if (line.startsWith("data:")) {
  // SSE parsing
} else if (line.includes(":")) {
  // Data Stream parsing
}
```

**Why It's Wrong:**
- Your API endpoint only returns Vercel Data Stream Protocol
- SSE support adds unnecessary complexity
- Edge cases cause parse failures
- Confuses debugging

**Fix:** Single parsing path only:
```typescript
for (const line of lines) {
  if (!line.trim()) continue;
  
  // Vercel Data Stream Protocol: type:content
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) continue;
  
  const type = line.slice(0, colonIndex);
  const content = line.slice(colonIndex + 1);
  
  if (type === "0") {
    // Text chunk
    const json = JSON.parse(content);
    if (json.text) {
      fullText += json.text;
      yield {
        id: messageId,
        createdAt: new Date(),
        role: "assistant",
        content: [{ type: "text", text: fullText }],
      };
    }
  } else if (type === "3") {
    // Error chunk
    console.error("Stream error:", content);
  }
  // Ignore other types (tool calls, etc.)
}
```

---

### Issue 4: Missing @blocknote/xl-ai Extension

**File:** `packages/ui/src/components/blocknote-editor.tsx`

**Current (WRONG):**
```typescript
const editor = useCreateBlockNote({
  // No AI extension = no AI features
  dictionary: customDictionary,
});
```

**Why It's Wrong:**
- `@blocknote/xl-ai` package not imported
- AI extension not created/passed
- BlockNote has no AI menu, no transport usage
- Result: Even with correct transport, no streaming possible

**Fix:**
```typescript
import { createAIExtension } from "@blocknote/xl-ai";
import { BackendTransport } from "../lib/backend-transport";

// Create transport instance
const transport = useMemo(() => 
  new BackendTransport({
    api: "/api/ai/chat",
    headers: async () => ({
      "Content-Type": "application/json",
    }),
    getExtraBody: async () => ({
      userApiKey: apiSettings?.apiKey,
      provider: apiSettings?.provider,
      model: apiSettings?.model,
    }),
  }),
  [apiSettings]
);

// Include AI extension
const editor = useCreateBlockNote({
  dictionary: customDictionary,
  extensionInitializers: [
    createAIExtension({
      transport,
      stream: true,  // Enable streaming
    }),
  ],
});
```

---

### Issue 5: Backend Doesn't Inject Document State

**File:** `apps/web/app/api/ai/chat/route.ts`

**Current (MISSING):**
```typescript
// No document context injected
const result = streamText({
  model: modelInstance,
  messages: convertedMessages,
  // LLM has no idea about editor content, selection, etc.
});
```

**Why It's Wrong:**
- BlockNote sends `metadata.documentState` containing blocks, selection, formatting
- Backend ignores this, sends raw user message only
- LLM lacks context about document structure
- Result: Generic responses, no awareness of document state

**Fix:**
```typescript
import { aiDocumentFormats, injectDocumentStateMessages } from "@blocknote/xl-ai/server";

// Extract document state from BlockNote metadata
const documentState = body.messages?.[body.messages.length - 1]?.metadata?.documentState;

// Inject into messages with proper system prompt
let messagesWithContext = convertedMessages;
if (documentState) {
  messagesWithContext = injectDocumentStateMessages(
    documentState,
    convertedMessages,
    "html" // or "markdown"
  );
}

// Ensure system message
if (messagesWithContext[0]?.role !== "system") {
  messagesWithContext.unshift({
    role: "system",
    content: aiDocumentFormats.html.systemPrompt,
  });
}

const result = streamText({
  model: modelInstance,
  messages: messagesWithContext,
  // Now LLM has document context
});
```

---

## ✅ Complete Fix Implementation

### Step 1: Update API Route (5 minutes)

**File:** `apps/web/app/api/ai/chat/route.ts`

Replace the entire POST function with:

```typescript
import createOpenAI from "@ai-sdk/openai";
import createAnthropic from "@ai-sdk/anthropic";
import createGoogleGenerativeAI from "@ai-sdk/google";
import createDeepSeek from "@ai-sdk/deepseek";
import { streamText, jsonSchema } from "ai";
import { aiDocumentFormats, injectDocumentStateMessages } from "@blocknote/xl-ai/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  console.log("🟡 AI ROUTE CALLED");
  
  try {
    const body = await req.json();
    const {
      messages,
      userApiKey,
      provider,
      model,
      toolDefinitions,
    } = body;

    console.log("📊 Request:", {
      provider,
      model,
      hasApiKey: !!userApiKey,
      messageCount: messages?.length,
    });

    // Validate inputs
    if (!userApiKey || !provider) {
      return new Response(
        JSON.stringify({ error: "Missing API key or provider" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages must be an array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create model instance
    let modelInstance;
    try {
      switch (provider) {
        case "openai":
          const openai = createOpenAI({ apiKey: userApiKey });
          modelInstance = openai(model || "gpt-4o");
          break;
        case "google":
          const google = createGoogleGenerativeAI({ apiKey: userApiKey });
          modelInstance = google(model || "gemini-2.0-flash-exp");
          break;
        case "grok":
          const xai = createOpenAI({
            apiKey: userApiKey,
            baseURL: "https://api.x.ai/v1",
          });
          modelInstance = xai(model || "grok-2-latest");
          break;
        case "anthropic":
          const anthropic = createAnthropic({ apiKey: userApiKey });
          modelInstance = anthropic(model || "claude-3-5-sonnet-20241022");
          break;
        case "deepseek":
          const deepseek = createOpenAI({
            baseURL: "https://api.deepseek.com",
            apiKey: userApiKey?.trim(),
          });
          modelInstance = deepseek("deepseek-chat");
          break;
        default:
          return new Response(
            JSON.stringify({ error: "Invalid provider" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
      }
    } catch (modelError: any) {
      console.error("❌ Model creation error:", modelError);
      return new Response(
        JSON.stringify({ error: "Failed to create model", details: modelError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // FIX #1: Convert BlockNote message format (parts → content)
    const messagesWithContent = messages.map((m: any) => {
      if (m.parts && Array.isArray(m.parts) && m.parts.length > 0 && !m.content) {
        const textParts = m.parts
          .filter((p: any) => p.type === "text" && p.text)
          .map((p: any) => p.text);
        return { ...m, content: textParts.join(" ") };
      }
      return m;
    });

    // Filter valid messages
    const validMessages = messagesWithContent.filter((m: any) => {
      if (m.parts && Array.isArray(m.parts) && m.parts.length === 0) return false;
      if (!m.content) return false;
      if (typeof m.content === "string") return m.content.trim().length > 0;
      return true;
    });

    if (validMessages.length === 0) {
      validMessages.push({
        id: "default",
        role: "user",
        content: "Hello",
      });
    }

    // FIX #2: Proper message conversion to CoreMessage
    const convertedMessages = validMessages.map((m: any) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : m.content,
    }));

    console.log("📨 Converted messages:", convertedMessages.length);

    // FIX #3: Extract and inject document state
    const documentState = messages?.[messages.length - 1]?.metadata?.documentState;
    let messagesWithContext = convertedMessages;

    if (documentState) {
      console.log("📄 Document state detected, injecting...");
      try {
        messagesWithContext = injectDocumentStateMessages(
          documentState,
          convertedMessages,
          "html"
        );
      } catch (err) {
        console.warn("Could not inject document state:", err);
        // Continue with original messages
      }
    }

    // Ensure system message
    if (messagesWithContext.length === 0 || messagesWithContext[0]?.role !== "system") {
      messagesWithContext.unshift({
        role: "system",
        content: aiDocumentFormats.html.systemPrompt,
      });
    }

    console.log("🚀 Starting stream...");

    // FIX #4: Stream with proper error handling
    const result = streamText({
      model: modelInstance,
      messages: messagesWithContext,
      tools: toolDefinitions ? Object.entries(toolDefinitions).reduce((acc: any, [name, def]: any) => {
        acc[name] = {
          description: def.description,
          parameters: jsonSchema(def.inputSchema),
        };
        return acc;
      }, {}) : undefined,
      toolChoice: "auto",
      onError: (error: any) => {
        console.error("❌ Stream error:", error.message);
        if (error.stack) console.error(error.stack);
      },
    });

    // FIX #5: Return proper Data Stream Response format
    console.log("✅ Using toDataStreamResponse (v5 format)");
    // @ts-ignore - SDK version compatibility
    if (typeof result.toDataStreamResponse === "function") {
      return result.toDataStreamResponse();
    }

    // Fallback
    return result.toTextStreamResponse();

  } catch (error: any) {
    console.error("❌ Route error:", error.message);
    if (error.stack) console.error(error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

---

### Step 2: Fix Backend Transport (10 minutes)

**File:** `packages/ui/src/lib/backend-transport.ts`

Delete everything and replace with:

```typescript
import type { ChatTransport, UIMessageChunk } from "ai";

interface BackendTransportOptions {
  api: string;
  headers?: () => Promise<Record<string, string>>;
  getExtraBody?: () => Promise<Record<string, any>>;
}

/**
 * Backend transport for BlockNote AI
 * Handles Vercel AI SDK v5 Data Stream Protocol
 */
export class BackendTransport implements ChatTransport<any> {
  private api: string;
  private headers?: () => Promise<Record<string, string>>;
  private getExtraBody?: () => Promise<Record<string, any>>;

  constructor(options: BackendTransportOptions) {
    this.api = options.api;
    this.headers = options.headers;
    this.getExtraBody = options.getExtraBody;
  }

  async sendMessages(
    messages: any
  ): Promise<AsyncIterable<UIMessageChunk>> {
    console.log("📤 BackendTransport.sendMessages called");
    console.log("Messages:", messages.length);

    const extraBody = this.getExtraBody ? await this.getExtraBody() : {};
    const headers = this.headers ? await this.headers() : {};

    const requestBody = {
      ...extraBody,
      messages,
    };

    console.log("📤 Fetching:", this.api);

    const response = await fetch(this.api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return this.parseStream(response);
  }

  /**
   * Parse Vercel Data Stream Protocol into UIMessageChunks
   * Format: type:content (e.g., "0:{"text":"hello"}" for text)
   */
  private async *parseStream(
    response: Response
  ): AsyncIterable<UIMessageChunk> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let fullText = "";
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // Parse Data Stream Protocol: type:content
            const colonIndex = line.indexOf(":");
            if (colonIndex === -1) {
              console.warn("❌ Invalid line format:", line);
              continue;
            }

            const type = line.slice(0, colonIndex);
            const content = line.slice(colonIndex + 1);

            if (type === "0") {
              // Text chunk
              console.log(`📝 Chunk ${chunkCount}: text`);
              try {
                const json = JSON.parse(content);
                if (json.text) {
                  fullText += json.text; // ACCUMULATE
                  chunkCount++;

                  console.log(
                    `✅ Accumulated: "${fullText.substring(fullText.length - 20)}..."`
                  );

                  yield {
                    id: messageId,
                    createdAt: new Date(),
                    role: "assistant",
                    content: [
                      {
                        type: "text",
                        text: fullText, // Full text, not delta
                      },
                    ],
                  };
                }
              } catch (parseErr) {
                console.error("❌ JSON parse error in text chunk:", parseErr);
              }
            } else if (type === "3") {
              // Error chunk
              console.error("❌ Stream error from server:", content);
            } else if (type === "d") {
              // Reasoning chunk (ignored for now)
              console.log("💭 Reasoning chunk (ignored)");
            } else {
              // Other chunks (tool calls, etc.)
              console.log(`⏭️  Ignoring chunk type ${type}`);
            }
          } catch (err) {
            console.error("❌ Parse error:", err, "Line:", line);
            continue;
          }
        }
      }

      // Handle remaining buffer
      if (buffer.trim()) {
        try {
          const colonIndex = buffer.indexOf(":");
          if (colonIndex !== -1) {
            const type = buffer.slice(0, colonIndex);
            const content = buffer.slice(colonIndex + 1);

            if (type === "0") {
              const json = JSON.parse(content);
              if (json.text) {
                fullText += json.text;
                yield {
                  id: messageId,
                  createdAt: new Date(),
                  role: "assistant",
                  content: [
                    {
                      type: "text",
                      text: fullText,
                    },
                  ],
                };
              }
            }
          }
        } catch (err) {
          console.warn("❌ Error processing final buffer:", err);
        }
      }

      console.log(`✅ Stream complete. Total chunks: ${chunkCount}`);
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

### Step 3: Setup AI Extension in BlockNote (5 minutes)

**File:** `packages/ui/src/components/blocknote-editor.tsx`

Update the editor component:

```typescript
"use client";

import { useState, useMemo, useEffect } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/xl-ai/style.css";

import { en as defaultEn } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import { createAIExtension } from "@blocknote/xl-ai";

import { BackendTransport } from "../lib/backend-transport";
import type { BlockNoteEditorProps } from "../types";
import { EditorErrorBoundary } from "./editor-error-boundary";
import { EditorLoading } from "./editor-loading";
import { getAISettings } from "../lib/ai-key-manager";

const customDictionary = {
  ...defaultEn,
  ai: aiEn,
};

export function BlockNoteEditor({
  theme = "light",
  className,
  style,
  initialContent,
  onChange,
  onEditorReady,
  editable = true,
}: BlockNoteEditorProps) {
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load API settings
  useEffect(() => {
    try {
      const settings = getAISettings();
      setApiSettings(settings);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load API settings:", err);
      setIsLoading(false);
    }
  }, []);

  // Create transport with API settings
  const transport = useMemo(() => {
    if (!apiSettings?.apiKey) {
      console.warn("⚠️  No API key configured");
      return new BackendTransport({ api: "/api/ai/chat" });
    }

    return new BackendTransport({
      api: "/api/ai/chat",
      headers: async () => ({
        "Content-Type": "application/json",
      }),
      getExtraBody: async () => ({
        userApiKey: apiSettings.apiKey,
        provider: apiSettings.provider || "openai",
        model: apiSettings.model || "gpt-4o",
      }),
    });
  }, [apiSettings]);

  // Create AI extension
  const aiExtension = useMemo(() => {
    try {
      return createAIExtension({
        transport,
        stream: true, // Enable streaming
      });
    } catch (err) {
      console.error("Failed to create AI extension:", err);
      return null;
    }
  }, [transport]);

  // Create editor
  let editor;
  try {
    editor = useCreateBlockNote({
      dictionary: customDictionary,
      initialContent,
      extensionInitializers: aiExtension ? [aiExtension] : [],
    });
  } catch (err: any) {
    setError(err);
    return <EditorErrorBoundary fallback={<div>Failed to create editor</div>} />;
  }

  // Notify when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  if (isLoading) {
    return <EditorLoading />;
  }

  if (error) {
    return <EditorErrorBoundary fallback={<div>Error: {error.message}</div>} />;
  }

  return (
    <div
      className={`bn-container-wrapper ${className || ""}`}
      style={{ ...style, theme }}
      data-color-scheme={theme}
    >
      {editor ? (
        <BlockNoteView
          editor={editor}
          onChange={onChange}
          editable={editable}
          className={`bn-container ${className || ""}`}
        />
      ) : (
        <EditorLoading />
      )}
    </div>
  );
}
```

---

### Step 4: Install Missing Dependencies (2 minutes)

```bash
# From root or apps/web directory
npm install @blocknote/xl-ai
# or
pnpm add @blocknote/xl-ai
```

Verify installation:
```bash
ls node_modules/@blocknote/xl-ai/
```

---

## 🧪 Testing & Verification

### Test 1: Quick Stream Format Check

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"Say hello"}],
    "userApiKey": "your-key-here",
    "provider": "openai",
    "model": "gpt-4o"
  }'
```

**Expected Output:**
```
0:{"text":"Hello"}
0:{"text":", how"}
0:{"text":" can I"}
0:{"text":" help?"}
```

**Wrong Output:**
```
data: Hello
data: , how
# or
{"type":"text-delta","textDelta":"Hello"}
```

### Test 2: Browser DevTools

1. Open editor in browser
2. Open DevTools → Network tab
3. Select text and click AI button (stars icon)
4. Look for POST to `/api/ai/chat`
5. Response tab should show Data Stream format (multiple lines starting with `0:`)

### Test 3: Console Logging

Check browser console for:
- ✅ `"📤 BackendTransport.sendMessages called"`
- ✅ `"📝 Chunk N: text"`
- ✅ `"✅ Accumulated: "...hello world..."`
- ✅ `"✅ Stream complete"`

**No errors should appear** (except expected "other chunks ignored")

### Test 4: Text Appears in Editor

1. Select text in editor
2. Click AI stars button
3. Choose "Continue writing" or similar command
4. Text should stream character-by-character into editor

---

## 🔧 Advanced Debugging

### Enable Verbose Logging

Add to `backend-transport.ts`:

```typescript
// In parseStream, add at start:
console.log("📊 Full response headers:", {
  contentType: response.headers.get("content-type"),
  contentLength: response.headers.get("content-length"),
  xVercelAiDataStream: response.headers.get("x-vercel-ai-data-stream"),
});

// After each yield:
console.log("📤 Yielding chunk:", {
  id: chunk.id,
  text: chunk.content[0].text.substring(0, 50) + "...",
  length: chunk.content[0].text.length,
});
```

### Check Message Format at Backend

Add to `api/ai/chat/route.ts`:

```typescript
console.log("📨 Final messages to AI:", JSON.stringify(messagesWithContext, null, 2));
console.log("📊 Document state present:", !!documentState);
```

### Monitor Transport Instantiation

Add to `blocknote-editor.tsx`:

```typescript
console.log("🔌 Transport created:", {
  api: transport.api,
  hasHeaders: !!transport.headers,
  hasExtraBody: !!transport.getExtraBody,
});

console.log("🤖 AI Extension:", aiExtension ? "ENABLED" : "DISABLED");
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Cannot read property 'text' of undefined"

**Cause:** Transport yielding wrong chunk structure  
**Solution:** Ensure `content: [{ type: "text", text: fullText }]` structure

### Issue: No AI menu appears (no stars button)

**Cause:** AI extension not initialized  
**Solution:** Check `@blocknote/xl-ai` installed and `createAIExtension` called

### Issue: Text appears but doesn't stream (all at once after delay)

**Cause:** Parser buffering too aggressively  
**Solution:** Check `yield` is called for each chunk

### Issue: "Invalid JSON" errors in console

**Cause:** Malformed Data Stream Protocol lines  
**Solution:** Verify backend returns `0:{"text":"..."}` format exactly

### Issue: Stream stops midway

**Cause:** Error chunk (type 3) not handled properly  
**Solution:** Error chunks should not break stream, continue to next line

---

## 📋 Implementation Checklist

- [ ] Install `@blocknote/xl-ai` in `apps/web` or root
- [ ] Update `api/ai/chat/route.ts`: Change `toUIMessageStreamResponse` → `toDataStreamResponse`
- [ ] Add document state injection to API route
- [ ] Add system message to API route
- [ ] Replace entire `backend-transport.ts` with new version
- [ ] Update `blocknote-editor.tsx` to import and use `createAIExtension`
- [ ] Add `BackendTransport` instantiation with API settings
- [ ] Pass `transport` to `createAIExtension`
- [ ] Restart dev server: `npm run dev`
- [ ] Test with curl command ✅
- [ ] Test in browser DevTools ✅
- [ ] Test text streaming in editor ✅
- [ ] Check console for debug logs ✅
- [ ] Enable verbose logging (optional)
- [ ] Test with different AI providers (optional)

---

## 🚀 Optimization Tips

### 1. Chunk Buffering (for smoother UX)

Instead of yielding every tiny chunk, buffer for 50ms:

```typescript
const chunks: UIMessageChunk[] = [];
let lastYield = Date.now();

// In parse loop:
chunks.push(chunk);
if (Date.now() - lastYield > 50) {
  for (const c of chunks) yield c;
  chunks = [];
  lastYield = Date.now();
}

// At end:
for (const c of chunks) yield c;
```

### 2. Reduce Console Spam

In production, remove debug logs or use environment check:

```typescript
const isDev = process.env.NODE_ENV === "development";
if (isDev) console.log("Debug message");
```

### 3. Error Recovery

Wrap fetch in retry logic:

```typescript
const MAX_RETRIES = 3;
let attempts = 0;
while (attempts < MAX_RETRIES) {
  try {
    const response = await fetch(this.api, {...});
    return this.parseStream(response);
  } catch (err) {
    attempts++;
    if (attempts >= MAX_RETRIES) throw err;
    await new Promise(r => setTimeout(r, 1000 * attempts)); // Exponential backoff
  }
}
```

---

## 📖 Reference Documentation

- [BlockNote AI Docs](https://www.blocknotejs.org/docs/features/ai/getting-started)
- [BlockNote AI Reference](https://www.blocknotejs.org/docs/features/ai/reference)
- [Vercel AI SDK v5](https://ai-sdk.dev)
- [Vercel Data Stream Protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
- [@blocknote/xl-ai NPM](https://www.npmjs.com/package/@blocknote/xl-ai)

---

## 🎯 Next Steps After Streaming Works

1. **Tool Support:** Implement tool calling for document actions
2. **Custom Commands:** Add domain-specific AI commands
3. **Offline Mode:** Cache responses locally with IndexedDB
4. **Rate Limiting:** Add request throttling on frontend
5. **Multi-Modal:** Support images/files in prompts
6. **Analytics:** Track AI usage, errors, user interactions

---

## 📞 Quick Help

**Q: Still not working after all fixes?**

A: Follow in order:
1. Check `@blocknote/xl-ai` actually installed (`ls node_modules/@blocknote/xl-ai`)
2. Restart dev server completely (`Ctrl+C`, then `npm run dev`)
3. Hard refresh browser (`Ctrl+Shift+R`)
4. Check console for specific errors (search for `❌`)
5. Check DevTools Network for `/api/ai/chat` response format

**Q: How do I know if transport is being used?**

A: Look in browser console for:
- `"📤 BackendTransport.sendMessages called"` - Transport is active
- `"📝 Chunk N: text"` - Data is being parsed
- `"✅ Stream complete"` - Stream finished successfully

**Q: Can I use multiple AI providers?**

A: Yes! API already supports OpenAI, Google, Anthropic, DeepSeek, Grok. Just change `provider` in API settings.

---

**Good luck! 🚀 You've got this!**
