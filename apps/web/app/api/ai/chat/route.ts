import { createOpenAI, openai } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

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

        // Special handling for DeepSeek to bypass SDK compatibility issues
        if (provider === "deepseek") {
            console.log("Using direct fetch for DeepSeek");
            console.log("DeepSeek Messages Payload:", JSON.stringify(messages, null, 2));

            // Sanitize messages for DeepSeek
            const sanitizedMessages = messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content || "" // Ensure content is never undefined
            }));

            const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${userApiKey}`
                },
                body: JSON.stringify({
                    model: model || "deepseek-chat",
                    messages: sanitizedMessages,
                    stream: true
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("DeepSeek API Error:", response.status, errorText);
                throw new Error(`DeepSeek API Error: ${response.status} ${errorText}`);
            }

            const encoder = new TextEncoder();
            const decoder = new TextDecoder();

            const stream = new ReadableStream({
                async start(controller) {
                    console.log("DeepSeek stream started");
                    if (!response.body) {
                        controller.close();
                        return;
                    }
                    const reader = response.body.getReader();
                    let buffer = "";

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split("\n");
                            buffer = lines.pop() || "";

                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed || !trimmed.startsWith("data: ")) continue;

                                const data = trimmed.slice(6);
                                if (data === "[DONE]") continue;

                                try {
                                    const json = JSON.parse(data);
                                    const content = json.choices?.[0]?.delta?.content;
                                    if (content) {
                                        // Send in data stream format: 0:"text"
                                        const chunk = `0:${JSON.stringify(content)}\n`;
                                        controller.enqueue(encoder.encode(chunk));
                                    }
                                } catch (e) {
                                    console.error("Error parsing DeepSeek chunk:", e);
                                }
                            }
                        }
                        console.log("DeepSeek stream completed");
                        controller.close();
                    } catch (error) {
                        console.error("DeepSeek stream error:", error);
                        controller.error(error);
                    }
                },
            });

            return new Response(stream, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Transfer-Encoding": "chunked",
                    "X-Vercel-AI-Data-Stream": "v1",
                },
            });
        }

        // Create model instance based on provider
        let modelInstance;

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

        // Ensure model instance exists
        if (!modelInstance) {
            console.error("Model instance is undefined");
            return new Response(
                JSON.stringify({ error: "Failed to create language model" }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        console.log("Calling streamText with messages:", JSON.stringify(messages));
        // Stream AI response
        const result = streamText({
            model: modelInstance,
            messages: messages,
            ...(toolDefinitions && { tools: toolDefinitions }),
            onFinish: (event) => {
                console.log("Stream finished. Usage:", event.usage);
                console.log("Finish reason:", event.finishReason);
                console.log("Text:", event.text);
            },
        });

        // Manual streaming with logging
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                console.log("Stream started");
                try {
                    for await (const chunk of result.textStream) {
                        console.log("Sending chunk:", chunk.length, "chars");
                        // Send in data stream format: 0:"text"
                        const line = `0:${JSON.stringify(chunk)}\n`;
                        controller.enqueue(encoder.encode(line));
                    }
                    console.log("Stream completed");
                    controller.close();
                } catch (error) {
                    console.error("Stream error:", error);
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
                "X-Vercel-AI-Data-Stream": "v1",
            },
        });

    } catch (error: any) {
        console.error("AI API Error:", error);

        // Handle specific error types
        if (error.message?.includes("API key") || error.message?.includes("401")) {
            return new Response(
                JSON.stringify({ error: "Invalid API key" }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        if (error.message?.includes("rate limit") || error.message?.includes("429")) {
            return new Response(
                JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
                {
                    status: 429,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

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
