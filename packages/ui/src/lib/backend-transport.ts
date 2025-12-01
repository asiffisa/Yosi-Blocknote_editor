import type { ChatTransport, UIMessageChunk } from "ai";

interface BackendTransportOptions {
    api: string;
    headers?: () => Promise<Record<string, string>>;
    getExtraBody?: () => Promise<Record<string, any>>;
}

/**
 * Transport that converts plain text SSE to UIMessageChunks  
 */
export class BackendTransport implements ChatTransport<any> {
    private api: string;
    private headers?: () => Promise<Record<string, string>>;
    private getExtraBody?: () => Promise<Record<string, any>>;

    constructor(options: BackendTransportOptions) {
        this.api = options.api;
        this.headers = options.headers;
        this.getExtraBody = options.getExtraBody;
    }

    async sendMessages({ messages, body }: any): Promise<ReadableStream<UIMessageChunk>> {
        console.log("🚀 BackendTransport.sendMessages called!");
        console.log("📨 Messages:", messages);

        const extraBody = this.getExtraBody ? await this.getExtraBody() : {};
        const headers = this.headers ? await this.headers() : {};

        console.log("📡 Fetching from:", this.api);

        const requestBody = {
            ...extraBody,
            ...(body || {}),
            messages, // Ensure messages is not overwritten
        };

        const response = await fetch(this.api, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify(requestBody),
        });

        console.log("✅ Response received:", response.status);

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorBody = await response.text();
                console.error("❌ Server error body:", errorBody);
                errorMessage = `${errorMessage}\n${errorBody}`;
            } catch (e) {
                console.error("❌ Could not read error body");
            }
            throw new Error(errorMessage);
        }

        // The backend returns toUIMessageStreamResponse() which is an HTTP Response
        // with a stream encoded in a specific format. We need to decode it into UIMessageChunk objects.
        console.log("✅ Manually parsing UI message stream");

        return new ReadableStream<UIMessageChunk>({
            async start(controller) {
                const reader = response.body!.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            if (!line.trim()) continue;

                            // Handle Vercel AI SDK Data Stream Protocol
                            // Format: "0:{string}" (text), "1:{json}" (tool call), etc.

                            console.log("🔹 Raw line:", line);

                            if (line.trim() === 'data: [DONE]') {
                                console.log("✅ Stream finished (legacy marker)");
                                continue;
                            }

                            const firstColonIndex = line.indexOf(':');
                            if (firstColonIndex !== -1) {
                                const type = line.slice(0, firstColonIndex);
                                const content = line.slice(firstColonIndex + 1);

                                try {
                                    // The content is JSON encoded
                                    const value = JSON.parse(content);

                                    if (type === '0') {
                                        // Text delta
                                        controller.enqueue({
                                            type: 'text-delta',
                                            textDelta: value, // Use textDelta as per AI SDK types
                                            id: "msg_" + Date.now()
                                        } as any);
                                    } else if (type === '1') {
                                        // Tool call
                                        controller.enqueue({
                                            type: 'tool-call',
                                            toolCallId: value.toolCallId,
                                            toolName: value.toolName,
                                            args: value.args
                                        } as any);
                                    } else if (type === '2') {
                                        // Tool result
                                        controller.enqueue({
                                            type: 'tool-result',
                                            toolCallId: value.toolCallId,
                                            result: value.result
                                        } as any);
                                    } else if (type === '3') {
                                        // Error
                                        console.error("❌ Stream error chunk:", value);
                                        // We can optionally throw or enqueue an error
                                        // For now, just log it. The stream might end after this.
                                    } else if (line.startsWith('data: ')) {
                                        // Fallback for old SSE format if needed
                                        const jsonStr = line.slice(6);
                                        try {
                                            const chunk = JSON.parse(jsonStr);
                                            // Check if chunk is already in UIMessageChunk format or needs conversion
                                            if (chunk.type) {
                                                // Map delta to textDelta if needed
                                                if (chunk.type === 'text-delta' && chunk.delta && !chunk.textDelta) {
                                                    chunk.textDelta = chunk.delta;
                                                }
                                                controller.enqueue(chunk as any);
                                            } else if (typeof chunk === 'string') {
                                                // Sometimes it's just the text
                                                controller.enqueue({
                                                    type: 'text-delta',
                                                    textDelta: chunk,
                                                    id: "msg_" + Date.now()
                                                } as any);
                                            } else {
                                                // Unknown object, assume it might be a text delta if it has content
                                                // or just log it
                                                console.log("⚠️ Unknown SSE object:", chunk);
                                            }
                                        } catch (e) {
                                            // If it's not JSON, maybe it's just text?
                                            console.warn("⚠️ Failed to parse SSE data as JSON:", jsonStr);
                                        }
                                    }
                                } catch (e) {
                                    console.warn("⚠️ Failed to parse stream data:", line);
                                }
                            }
                        }
                    }

                    try {
                        controller.close();
                    } catch (e) {
                        // Stream might be already closed or errored
                        console.warn("⚠️ Failed to close stream:", e);
                    }
                } catch (err) {
                    console.error("❌ Stream error:", err);
                    try {
                        controller.error(err);
                    } catch (e) {
                        // Stream might be already closed
                        console.warn("⚠️ Failed to error stream:", e);
                    }
                }
            }
        });
    }

    // Required by ChatTransport interface
    async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
        return null;
    }
}
