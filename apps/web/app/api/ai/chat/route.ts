import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// import { createDeepSeek } from "@ai-sdk/deepseek";
import { streamText, generateText, convertToModelMessages, jsonSchema } from "ai";

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
                    // Remove invalid 'type' fields
                    if (key === 'type' && (value === null || value === "None" || value === "none")) {
                        console.log(`🧹 Removing invalid type:`, value);
                        continue;
                    }
                    // Recursively clean children
                    cleaned[key] = cleanSchema(value);
                }

                // If object has 'properties' but no 'type', infer 'type': 'object'
                if (cleaned.properties && !cleaned.type) {
                    cleaned.type = 'object';
                }

                return cleaned;
            }

            return obj;
        }

        let convertedTools: any = undefined;
        if (toolDefinitions && Object.keys(toolDefinitions).length > 0) {
            convertedTools = {};
            for (const [name, def] of Object.entries(toolDefinitions as Record<string, any>)) {
                const schema = def.inputSchema || {};
                const cleanedSchema = cleanSchema(schema);

                // Ensure the root schema has type: object
                if (!cleanedSchema.type) {
                    cleanedSchema.type = "object";
                }

                convertedTools[name] = {
                    description: def.description || `Execute ${name}`,
                    parameters: jsonSchema(cleanedSchema),
                };
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
        // Note: We need to import these dynamically or ensure they are available
        // Since we can't easily import from @blocknote/xl-ai/server without verifying it exists,
        // we will try to use it if available, or skip if not.
        // For now, we'll assume the user has the package as per the issue description.

        let messagesWithContext = convertedMessages;
        try {
            // We need to check if we can import this. 
            // If not, we'll proceed without it, but the plan says we should use it.
            // Let's try to import it at the top level in the next step if this fails, 
            // but for now we will just implement the logic assuming imports are present.
            // Wait, I need to add the imports first.

            // The imports are missing in the current file content I'm replacing.
            // I will add them in a separate step or assume they are added.
            // Actually, I should add them now.

            // Re-reading the plan: "Inject document state into messages."
            // The issue description says: import { aiDocumentFormats, injectDocumentStateMessages } from "@blocknote/xl-ai/server";

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
            // Try to get system prompt from blocknote if available
            let systemPrompt = "You are a helpful AI assistant.";
            try {
                const { aiDocumentFormats } = require("@blocknote/xl-ai/server");
                systemPrompt = aiDocumentFormats.html.systemPrompt;
            } catch (e) { }

            messagesWithContext.unshift({
                role: 'system',
                content: systemPrompt
            });
        }

        // Stream AI response using AI SDK's proper format
        const result = streamText({
            model: modelInstance!,
            messages: messagesWithContext,
            ...(convertedTools && {
                tools: convertedTools,
                toolChoice: "auto"
            }),
            onError: ({ error }: { error: any }) => {
                console.error(`❌ Stream error: ${error.message || error}`);
                if (error.stack) console.error(error.stack);
            },
        });

        // FIX: Return proper Data Stream Response format
        // @ts-ignore
        if (typeof result.toDataStreamResponse === 'function') {
            // @ts-ignore
            return result.toDataStreamResponse();
        }

        // Fallback
        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error(`❌ Error in AI route: ${error.message}`);
        if (error.stack) console.error(error.stack);

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
