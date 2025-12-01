
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

async function main() {
    const openai = createOpenAI({
        apiKey: "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",
    });

    const model = openai("gpt-4o");

    try {
        const messages: any[] = [
            { role: "user", content: "Hello" }
        ];

        // Mirror app logic
        const validMessages = messages.filter((m: any) => m.content);

        validMessages.unshift({
            role: "system",
            content: "You are a helpful AI assistant. Note: Document operations are currently unavailable due to a technical issue. Please provide text suggestions instead."
        });

        const convertedMessages = validMessages.map((m: any) => ({
            role: m.role,
            content: m.content
        }));

        const result = streamText({
            model: model,
            messages: convertedMessages,
        });

        for await (const chunk of result.textStream) {
            process.stdout.write(chunk);
        }

        console.log("\nDone");
    } catch (error) {
        console.error("\nError:", error);
    }
}

main();
