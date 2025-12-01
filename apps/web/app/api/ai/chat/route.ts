import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, convertToModelMessages } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, userApiKey, provider, model, toolDefinitions } = body;

        console.log("AI API called with:", { provider, model, hasApiKey: !!userApiKey });

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

        if (!messages || messages.length === 0) {
            return new Response(
                JSON.stringify({ error: "No messages provided" }),
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
                    // Use OpenAI client for DeepSeek as it's compatible
                    const deepseek = createOpenAI({
                        apiKey: userApiKey,
                        baseURL: "https://api.deepseek.com/v1",
                    });
                    modelInstance = deepseek(model || "deepseek-chat");
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

        // Stream AI response using AI SDK's proper format
        const result = streamText({
            model: modelInstance!,
            messages: convertToModelMessages(messages),
            // Pass tools directly - AI SDK accepts the toolDefinitions object
            ...(toolDefinitions && {
                tools: toolDefinitions,
                toolChoice: "auto" // Allow model to choose between text and tools
            }),
        });

        console.log("✅ streamText result created");

        // Manually format to Data Stream Protocol to ensure tool calls are sent
        // 0: text
        // 9: tool call
        const transformedStream = result.fullStream.pipeThrough(
            new TransformStream({
                transform(chunk, controller) {
                    console.log("📦 Server chunk:", chunk.type);
                    if (chunk.type === "text-delta") {
                        const line = `0:${JSON.stringify(chunk.text)}\n`;
                        console.log("📤 Emitting text:", line.trim());
                        controller.enqueue(line);
                    } else if (chunk.type === "tool-call") {
                        const line = `9:${JSON.stringify({
                            toolCallId: chunk.toolCallId,
                            toolName: chunk.toolName,
                            args: (chunk as any).args,
                        })}\n`;
                        console.log("📤 Emitting tool-call:", chunk.toolName);
                        controller.enqueue(line);
                    } else {
                        console.log("⚠️ Skipping chunk type:", chunk.type);
                    }
                },
            })
        );

        console.log("🔄 Stream transformation configured");

        // Return as plain text stream (Data Stream Protocol)
        const encoder = new TextEncoder();
        const encodedStream = transformedStream.pipeThrough(
            new TransformStream({
                transform(chunk, controller) {
                    controller.enqueue(encoder.encode(chunk));
                },
            })
        );

        console.log("✅ Returning response");

        return new Response(encodedStream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "X-Vercel-AI-Data-Stream": "v1",
            },
        });

    } catch (error: any) {
        console.error("AI API Error:", error);
        return new Response(
            JSON.stringify({
                error: error.message || "AI request failed"
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
