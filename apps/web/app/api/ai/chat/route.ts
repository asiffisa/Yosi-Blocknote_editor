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

                // case "deepseek":
                //     const deepseekProvider = createDeepSeek({
                //         apiKey: userApiKey,
                //     });
                //     modelInstance = deepseekProvider(model || "deepseek-chat");
                //     break;

                default:
                    return new Response(
                        JSON.stringify({ error: `Invalid provider: ${provider}` }),
                        {
                            status: 400,
                            headers: { "Content-Type": "application/json" },
                        }
                    );
            }

            console.log("Model instance created successfully");
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

        console.log("🚀 Calling streamText...");

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
                return cleaned;
            }

            return obj;
        }

        let convertedTools: any = undefined;
        if (toolDefinitions && Object.keys(toolDefinitions).length > 0) {
            convertedTools = {};
            for (const [name, def] of Object.entries(toolDefinitions as Record<string, any>)) {
                const schema = def.inputSchema || {};
                console.log(`🔍 Processing tool ${name} schema...`);
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
            // console.log("🔧 Converted tools:", JSON.stringify(convertedTools, null, 2));
        }
        console.log("🚀 Calling streamText with model:", model);
        console.log("🤖 Provider:", provider);
        console.log("📨 Incoming messages (raw):", JSON.stringify(messages, null, 2));

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

        console.log("🔧 [FIX] Messages after parts-to-content conversion:", JSON.stringify(messagesWithContent, null, 2));

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

        console.log("🔍 Valid messages after filtering:", validMessages.length, "messages");

        if (validMessages.length === 0) {
            console.warn("⚠️ No valid messages found. Adding a default user message.");
            validMessages.push({
                id: "default-user-msg",
                role: "user",
                content: "Hello, are you there?"
            });
        }

        console.log("🔍 Valid messages before conversion:", JSON.stringify(validMessages, null, 2));

        // Simplified message conversion - convert to CoreMessage format
        console.log("🔄 Converting messages to CoreMessage format");
        const convertedMessages = validMessages.map((m: any) => ({
            role: m.role,
            content: m.content,
        }));

        console.log("✅ Messages converted:", JSON.stringify(convertedMessages, null, 2));
        console.log("🔍 [DEBUG] Number of converted messages:", convertedMessages.length);
        console.log("🔍 [DEBUG] First user message:", convertedMessages.find(m => m.role === 'user')?.content);

        // Add system message if not present
        if (convertedMessages.length > 0 && convertedMessages[0].role !== 'system') {
            convertedMessages.unshift({
                role: 'system',
                content: "You are a helpful AI assistant."
            });
        }

        console.log("🔍 [DEBUG] Final messages sent to AI:", JSON.stringify(convertedMessages, null, 2));

        if (!convertedMessages || convertedMessages.length === 0) {
            return new Response(JSON.stringify({ error: "No valid messages with content provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Stream AI response using AI SDK's proper format
        const result = streamText({
            model: modelInstance!,
            messages: convertedMessages,
            // Tools disabled due to schema validation error with AI SDK v5
            // ...(convertedTools && {
            //     tools: convertedTools,
            //     toolChoice: "auto"
            // }),
        });

        console.log("✅ streamText result created");

        // Return plain text stream
        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error("❌ Error in AI route:", error);

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
