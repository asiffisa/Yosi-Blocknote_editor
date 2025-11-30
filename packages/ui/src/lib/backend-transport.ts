import { UIMessage, UIMessageChunk } from "ai";

// Define interface locally to ensure compatibility
export interface ChatTransport<UI_MESSAGE> {
    sendMessages(args: {
        messages: UI_MESSAGE[];
        body: any;
    }): Promise<ReadableStream<UIMessageChunk>>;
}

export class BackendTransport implements ChatTransport<UIMessage> {
    constructor(
        private options: {
            api: string;
            headers?: () => Promise<Record<string, string>>;
            getExtraBody?: (messages: UIMessage[]) => Promise<any>;
        }
    ) { }

    async sendMessages({
        messages,
        body,
    }: {
        messages: UIMessage[];
        body: any;
    }): Promise<ReadableStream<UIMessageChunk>> {
        const headers = this.options.headers ? await this.options.headers() : {};
        const extraBody = this.options.getExtraBody ? await this.options.getExtraBody(messages) : {};

        const response = await fetch(this.options.api, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify({
                messages,
                ...body, // Includes toolDefinitions from AI SDK
                ...extraBody, // Includes userApiKey, provider, model
            }),
        });

        if (!response.ok) {
            let errorText = response.statusText;
            try {
                const errorJson = await response.json();
                if (errorJson.error) errorText = errorJson.error;
            } catch (e) {
                // Ignore JSON parse error
            }
            throw new Error(`AI Request failed: ${errorText}`);
        }

        if (!response.body) {
            throw new Error("No response body");
        }

        const reader = response.body.getReader();
        let buffer = "";

        return new ReadableStream({
            async start(controller) {
                // Use a fixed ID to rule out generation issues
                const messageId = "debug-id-fixed-123";

                // Wrapper to log all enqueued chunks
                const originalEnqueue = controller.enqueue.bind(controller);
                controller.enqueue = (chunk: any) => {
                    console.log(`BackendTransport: Enqueueing ${chunk.type} chunk:`, JSON.stringify(chunk));
                    originalEnqueue(chunk);
                };

                console.log("BackendTransport: Starting REAL stream with ID:", messageId);

                try {
                    // 1. Text Start - Critical for initialization
                    controller.enqueue({
                        type: "text-start",
                        id: messageId,
                        role: "assistant",
                        providerMetadata: {},
                    } as any);

                    // Yield to event loop to ensure text-start is processed before deltas
                    await new Promise(resolve => setTimeout(resolve, 100));

                    const decoder = new TextDecoder();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            if (buffer.trim()) {
                                processLines(buffer, controller, messageId);
                            }

                            // 3. Text End
                            controller.enqueue({
                                type: "text-end",
                                id: messageId,
                                providerMetadata: {},
                            } as any);

                            // 4. Finish
                            controller.enqueue({
                                type: "finish",
                                id: messageId,
                                finishReason: "stop",
                                usage: {
                                    promptTokens: 0,
                                    completionTokens: 0,
                                    totalTokens: 0,
                                },
                                response: {
                                    id: messageId,
                                    model: "deepseek-chat",
                                    timestamp: new Date(),
                                }
                            } as any);

                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            if (line.trim()) {
                                console.log("BackendTransport: Raw line from stream:", line);
                            }
                        }

                        processLines(lines.join("\n"), controller, messageId);
                    }
                    console.log("BackendTransport: Closing controller");
                    controller.close();
                } catch (err) {
                    console.error("BackendTransport: Stream error:", err);
                    controller.error(err);
                }
            },
            cancel(reason) {
                console.warn("BackendTransport: Stream cancelled by consumer:", reason);
                reader.cancel();
            },
        });
    }
}

function processLines(chunk: string, controller: ReadableStreamDefaultController<UIMessageChunk>, messageId: string) {
    const lines = chunk.split("\n");
    for (const line of lines) {
        if (!line.trim()) continue;

        if (line.startsWith("0:")) {
            try {
                const text = JSON.parse(line.slice(2));
                if (!text) continue;

                if (controller.desiredSize === null) return;

                // 2. Text Delta
                controller.enqueue({
                    type: "text-delta",
                    delta: text,
                    id: messageId,
                    providerMetadata: {},
                } as any);
            } catch (e) {
                console.error("Failed to parse text delta:", line, e);
            }
        } else if (line.startsWith("e:")) {
            try {
                const error = JSON.parse(line.slice(2));
                console.error("AI Stream Error:", error);
            } catch (e) {
                console.error("Failed to parse error:", line, e);
            }
        }
    }
}
