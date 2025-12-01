
import { convertToCoreMessages, CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openai = createOpenAI({
    apiKey: "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",
});

const model = openai("gpt-4o");

// Simulate UI messages with mixed content (text, tool calls, etc.)
const uiMessages = [
    {
        id: "1",
        role: "user",
        content: "Hello",
    },
    {
        id: "2",
        role: "assistant",
        content: "",
        parts: [
            { type: "text", text: "Hi there!" },
            { type: "tool-call", toolCallId: "123", toolName: "test", args: {} }
        ]
    },
    {
        id: "3",
        role: "tool",
        content: "",
        parts: [
            { type: "tool-result", toolCallId: "123", result: "success" }
        ]
    }
];

async function testManualConversion() {
    console.log("--- Testing Manual Conversion ---");
    const convertedMessages = uiMessages.map((m: any) => {
        const role = m.role as "system" | "user" | "assistant" | "tool";

        if (m.parts && Array.isArray(m.parts)) {
            const filteredParts = m.parts.filter((p: any) => p.type === 'text' || p.type === 'image');
            if (filteredParts.length === 0) return null;

            return {
                role: role,
                content: filteredParts.map((p: any) => {
                    if (p.type === 'text') return { type: 'text', text: p.text };
                    return p;
                }),
            };
        }

        if (typeof m.content === 'string') {
            return {
                role: role,
                content: m.content,
            };
        }

        return null;
    }).filter((m: any) => m !== null);

    console.log("Converted:", JSON.stringify(convertedMessages, null, 2));

    try {
        const result = streamText({
            model,
            messages: convertedMessages as CoreMessage[],
        });
        console.log("Stream started successfully");
        for await (const chunk of result.textStream) {
            process.stdout.write(chunk);
        }
        console.log("\nDone");
    } catch (e) {
        console.error("Manual conversion failed:", e);
    }
}

async function testSDKConversion() {
    console.log("\n--- Testing SDK convertToCoreMessages ---");
    try {
        // convertToCoreMessages expects UIMessage[] which has specific fields.
        // Our mock might need adjustment to match UIMessage exactly if strict.
        const converted = convertToCoreMessages(uiMessages as any);
        console.log("Converted:", JSON.stringify(converted, null, 2));

        const result = streamText({
            model,
            messages: converted,
        });
        console.log("Stream started successfully");
        for await (const chunk of result.textStream) {
            process.stdout.write(chunk);
        }
        console.log("\nDone");
    } catch (e) {
        console.error("SDK conversion failed:", e);
    }
}

async function main() {
    await testManualConversion();
    await testSDKConversion(); // Uncomment to test SDK conversion
}

main();
