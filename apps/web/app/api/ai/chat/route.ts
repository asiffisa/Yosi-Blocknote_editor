import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// import { createDeepSeek } from "@ai-sdk/deepseek";
import { streamText, generateText, convertToModelMessages, jsonSchema } from "ai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
    console.log("========== AI ROUTE CALLED ==========");
    try {
        const body = await req.json();

        const { messages, userApiKey, provider, model, toolDefinitions } = body;

        console.log("AI API called with:", { provider, model, hasApiKey: !!userApiKey, messagesType: typeof messages, messagesIsArray: Array.isArray(messages) });

        // Validate inputs
        if (!userApiKey || !provider) {
            return new Response(
                JSON.stringify({ error: "Missing API key or provider" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        if (!messages || !Array.isArray(messages)) {
            console.error("❌ Messages is missing or not an array:", messages);
            return new Response(
                JSON.stringify({ error: "Messages must be an array" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        let modelInstance;

        // Create model based on provider
        try {
            switch (provider) {
                case "openai":
                    const openaiInstance = createOpenAI({
                        apiKey: userApiKey,
                    });
                    modelInstance = openaiInstance(model || "gpt-4o");
                    break;

                case "google":
                    const google = createGoogleGenerativeAI({
                        apiKey: userApiKey,
                    });
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
                    const anthropic = createAnthropic({
                        apiKey: userApiKey,
                    });
                    modelInstance = anthropic(model || "claude-3-5-sonnet-20241022");
                    break;

                case "deepseek":
                    console.log("🔵 Initializing DeepSeek provider");

                    // DeepSeek is compatible with OpenAI SDK
                    const deepseek = createOpenAI({
                        baseURL: "https://api.deepseek.com",
                        apiKey: userApiKey?.trim(),
                    });
                    const deepseekModel = model || "deepseek-chat";
                    console.log(`🔵 DeepSeek model: ${deepseekModel}`);
                    modelInstance = deepseek(deepseekModel);
                    break;

                default:
                    return new Response(
                        JSON.stringify({ error: `Invalid provider: ${provider}` }),
                        {
                            status: 400,
                            headers: { "Content-Type": "application/json" },
                        }
                    );
            }

            console.log("✅ Model instance created successfully");
        } catch (modelError: any) {
            console.error("Model creation error:", modelError);
            return new Response(
                JSON.stringify({
                    error: `Failed to create model: ${modelError.message}`
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Helper function to recursively clean schema
        function cleanSchema(obj: any): any {
            if (obj === null || obj === undefined) return obj;

            if (Array.isArray(obj)) {
                return obj.map(cleanSchema);
            }

            if (typeof obj === 'object') {
                const cleaned: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    // 1. Remove invalid 'type' fields (case-insensitive check)
                    if (key === 'type' && typeof value === 'string') {
                        if (value.toLowerCase() === 'none' || value.toLowerCase() === 'null') {
                            continue;
                        }
                    }
                    // Recursively clean children
                    cleaned[key] = cleanSchema(value);
                }

                // 2. Ensure root has a valid type if properties exist
                if (cleaned.properties && !cleaned.type) {
                    cleaned.type = 'object';
                }

                // 3. If type is missing and it's a root object, default to object to satisfy strict validators
                // (Only if it has keys, to avoid turning empty objects into schemas if they aren't meant to be)
                if (Object.keys(cleaned).length > 0 && !cleaned.type && !cleaned.anyOf && !cleaned.oneOf) {
                    // Heuristic: if it has no type, but looks like a schema, default to object
                    // Safest for empty schema is type: object
                }

                return cleaned;
            }

            return obj;
        }

        // Enable Tools for BlockNote
        let convertedTools: any = undefined;
        if (toolDefinitions && Object.keys(toolDefinitions).length > 0) {
            console.log("✅ Processing tools for BlockNote");
            convertedTools = {};
            for (const [name, def] of Object.entries(toolDefinitions as Record<string, any>)) {
                // Sanitize the schema using cleanSchema
                const parameters = def.parameters ? cleanSchema(def.parameters) : z.object({});

                convertedTools[name] = {
                    description: def.description || `Execute ${name}`,
                    parameters: jsonSchema(parameters),
                };
                console.log(`  📋 Tool: ${name}`);
            }
        }

        // CRITICAL FIX: BlockNote sends messages with 'parts' not 'content'
        // We need to convert parts to content FIRST
        const messagesWithContent = (messages || []).map((m: any) => {
            // If message has parts but no content, extract content from parts
            if (m.parts && Array.isArray(m.parts) && m.parts.length > 0 && !m.content) {
                // Extract text from all parts
                const textParts = m.parts
                    .filter((p: any) => p.type === 'text' && p.text)
                    .map((p: any) => p.text);

                // Join all text parts into single content string
                return {
                    ...m,
                    content: textParts.join('\n'),
                };
            }
            return m;
        });

        // Filter out messages with empty content to prevent model errors
        const validMessages = messagesWithContent.filter((m: any) => {
            // Skip if parts array exists but is empty
            if (m.parts && Array.isArray(m.parts) && m.parts.length === 0) {
                return false;
            }

            // Keep message if it has non-empty content
            if (!m.content) return false;

            if (typeof m.content === 'string') {
                return m.content.trim().length > 0;
            }

            return true; // Keep array content as-is
        });

        if (validMessages.length === 0) {
            validMessages.push({
                id: "default-user-msg",
                role: "user",
                content: "Hello"
            });
        }

        // Convert to CoreMessage format
        const convertedMessages = validMessages.map((m: any) => ({
            role: m.role,
            content: m.content,
        }));

        // FIX: Extract and inject document state
        let messagesWithContext = convertedMessages;
        try {
            const documentState = messages?.[messages.length - 1]?.metadata?.documentState;
            if (documentState) {
                const { injectDocumentStateMessages } = require("@blocknote/xl-ai/server");
                messagesWithContext = injectDocumentStateMessages(
                    documentState,
                    convertedMessages,
                    "html"
                );
            }
        } catch (e) {
            console.warn("Failed to inject document state:", e);
        }

        // Add system message if not present
        if (messagesWithContext.length > 0 && messagesWithContext[0].role !== 'system') {
            const systemPrompt = "You are a helpful AI assistant. IMPORTANT: Respond with plain text only. Do NOT generate JSON, do NOT use code blocks, do NOT use HTML tags. Just write your response as simple, natural text.";

            messagesWithContext.unshift({
                role: 'system',
                content: systemPrompt
            });
        }

        // Stream AI response using AI SDK's proper format
        const result = await streamText({
            model: modelInstance!,
            messages: messagesWithContext,
            tools: convertedTools,
            onError: ({ error }: { error: any }) => {
                console.error(`❌ Stream error: ${error.message || error}`);
                if (error.stack) console.error(error.stack);
            },
        });

        // Use pipeDataStreamToResponse() which sends the numeric Data Stream Protocol (0:"text")
        // that BlockNote's transport expects
        // @ts-ignore - TypeScript may not have the latest AI SDK types
        return result.pipeDataStreamToResponse?.(new Response()) || result.toDataStreamResponse?.() || result.toTextStreamResponse();

    } catch (error: any) {
        console.error(`❌ Error in AI route: ${error.message}`);
        if (error.stack) console.error(error.stack);

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
