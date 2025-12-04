import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, convertToModelMessages } from "ai";
import {
    aiDocumentFormats,
    injectDocumentStateMessages,
    toolDefinitionsToToolSet,
} from "@blocknote/xl-ai/server";

export const maxDuration = 30;

export async function POST(req: Request) {
    console.log("========== AI ROUTE CALLED ==========");
    try {
        const body = await req.json();

        const { messages, userApiKey, provider, model, toolDefinitions } = body;

        console.log("AI API called with:", {
            provider,
            model,
            hasApiKey: !!userApiKey,
            hasToolDefinitions: !!toolDefinitions,
            toolCount: toolDefinitions ? Object.keys(toolDefinitions).length : 0,
        });

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
                    error: `Failed to create model: ${modelError.message}`,
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Convert tools using BlockNote's helper
        const tools = toolDefinitions
            ? toolDefinitionsToToolSet(toolDefinitions)
            : undefined;

        console.log("✅ Tools converted:", tools ? Object.keys(tools) : "none");

        // Inject document state and convert messages using BlockNote helpers
        const processedMessages = convertToModelMessages(
            injectDocumentStateMessages(messages)
        );

        console.log("✅ Messages processed, count:", processedMessages.length);

        // Stream AI response with BlockNote's system prompt and tools
        const result = streamText({
            model: modelInstance!,
            system: aiDocumentFormats.html.systemPrompt,
            messages: processedMessages,
            tools,
            toolChoice: tools ? "required" : undefined,
            onError: ({ error }: { error: any }) => {
                console.error(`❌ Stream error: ${error.message || error}`);
                if (error.stack) console.error(error.stack);
            },
        });

        // Return UI message stream format that BlockNote expects
        return result.toUIMessageStreamResponse();
    } catch (error: any) {
        console.error(`❌ Error in AI route: ${error.message}`);
        if (error.stack) console.error(error.stack);

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
