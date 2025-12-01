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

        // Filter out messages with empty content to prevent model errors
        const validMessages = (messages || []).filter((m: any) => {
            if (m.parts && Array.isArray(m.parts) && m.parts.length > 0) return true;
            return m.content && (typeof m.content === 'string' ? m.content.trim() !== "" : true);
        });

        if (validMessages.length === 0) {
            console.warn("⚠️ No valid messages found. Adding a default user message.");
            validMessages.push({
                id: "default-user-msg",
                role: "user",
                content: "Hello, are you there?"
            });
        }

        // Add a system message
        validMessages.unshift({
            role: "system",
            content: "You are a helpful AI assistant."
        });

        console.log("🔍 Valid messages before conversion:", JSON.stringify(validMessages, null, 2));

        // Manual conversion to CoreMessage with strict validation
        const convertedMessages = validMessages.map((m: any) => {
            const role = m.role;

            // Validate role
            if (!['system', 'user', 'assistant', 'tool'].includes(role)) {
                console.warn(`⚠️ Invalid role: ${role}, skipping message.`);
                return null;
            }

            // Handle parts if present (new AI SDK format)
            if (m.parts && Array.isArray(m.parts)) {
                let filteredParts = m.parts;

                // Strict content validation per role
                if (role === 'user') {
                    // User can have text or image
                    filteredParts = m.parts.filter((p: any) => p.type === 'text' || p.type === 'image');
                } else if (role === 'assistant') {
                    // Assistant can have text or tool-call (but we are filtering tool calls for now)
                    filteredParts = m.parts.filter((p: any) => p.type === 'text');
                } else if (role === 'tool') {
                    // Tool messages must have tool-result
                    // Since we are disabling tools, we should probably skip tool messages entirely
                    return null;
                } else if (role === 'system') {
                    // System messages usually just have content string, but if parts, text only
                    filteredParts = m.parts.filter((p: any) => p.type === 'text');
                }

                if (filteredParts.length === 0) return null;

                return {
                    role: role as "system" | "user" | "assistant" | "tool",
                    content: filteredParts.map((p: any) => {
                        if (p.type === 'text') return { type: 'text', text: p.text };
                        // Add other part types if needed and valid for role
                        return p;
                    }),
                };
            }

            // Handle simple content string
            if (typeof m.content === 'string') {
                // System messages are fine as string
                // User messages are fine as string
                // Assistant messages are fine as string
                // Tool messages usually need parts (tool-result), so skip if string unless we know better
                if (role === 'tool') return null;

                // Check for empty string
                if (m.content.trim() === "") return null;

                return {
                    role: role as "system" | "user" | "assistant" | "tool",
                    content: m.content,
                };
            }

            return null;
        }).filter((m: any) => m !== null); // Remove null messages

        console.log("📨 Converted messages (strict):", JSON.stringify(convertedMessages, null, 2));

        if (convertedMessages.length === 0) {
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

        // Return using the AI SDK's toUIMessageStreamResponse
        return result.toUIMessageStreamResponse();
    } catch (error: any) {
        console.error("❌ Error in AI route:", error);

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
