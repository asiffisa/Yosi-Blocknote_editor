import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

interface ChatRequestBody {
    messages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
    }>;
}

/**
 * AI Chat API Route
 * Acts as a proxy to OpenAI/DeepSeek APIs, handling streaming responses
 * for BlockNote AI integration.
 * 
 * Receives configuration via headers (sent by DefaultChatTransport):
 * - X-API-Key: The API key for the LLM provider
 * - X-Provider: "deepseek" or "openai"
 * - X-Model: The specific model to use
 */
export async function POST(req: NextRequest) {
    try {
        const body: ChatRequestBody = await req.json();
        let { messages } = body;

        // Sanitize messages to ensure content is never null
        messages = messages.map(msg => ({
            ...msg,
            content: msg.content || ""
        }));

        // Extract configuration from headers
        const apiKey = req.headers.get("X-API-Key");
        const provider = req.headers.get("X-Provider") as "deepseek" | "openai" | null;
        const model = req.headers.get("X-Model");

        // Validation
        if (!apiKey) {
            return NextResponse.json(
                { error: "API key is required. Please configure it in settings." },
                { status: 401 }
            );
        }

        if (!messages || messages.length === 0) {
            return NextResponse.json(
                { error: "Messages are required" },
                { status: 400 }
            );
        }

        // Configure OpenAI client based on provider
        const openai = new OpenAI({
            apiKey,
            baseURL: provider === "deepseek"
                ? "https://api.deepseek.com"
                : "https://api.openai.com/v1",
        });

        // Determine the model to use
        const modelName = model || (provider === "deepseek" ? "deepseek-chat" : "gpt-4");

        // Create streaming completion
        const stream = await openai.chat.completions.create({
            model: modelName,
            messages,
            stream: true,
        });

        // Convert OpenAI stream to ReadableStream
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const text = chunk.choices[0]?.delta?.content || "";
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new NextResponse(readableStream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        });
    } catch (error: any) {
        console.error("AI API Error:", error);

        // Handle authentication errors
        if (error?.status === 401 || error?.message?.includes("authentication") || error?.message?.includes("API key")) {
            return NextResponse.json(
                { error: "Invalid API key. Please check your settings." },
                { status: 401 }
            );
        }

        // Handle rate limiting
        if (error?.status === 429) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: error?.message || "An error occurred while processing your request" },
            { status: 500 }
        );
    }
}
