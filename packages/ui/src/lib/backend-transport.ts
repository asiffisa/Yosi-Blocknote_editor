import type { ChatTransport, UIMessageChunk } from "ai";

interface BackendTransportOptions {
    api: string;
    headers?: () => Promise<Record<string, string>>;
    getExtraBody?: () => Promise<Record<string, any>>;
}

/**
 * Transport that converts plain text SSE to UIMessageChunks  
 */
export class BackendTransport implements ChatTransport {
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

        const response = await fetch(this.api, {
            method: "POST",
            headers: {
                ...headers,
            },
            body: JSON.stringify({
                messages,
                ...extraBody,
                ...body,
            }),
        });

        console.log("✅ Response received:", response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Return a ReadableStream that emits a single text chunk
        return new ReadableStream<UIMessageChunk>({
            async start(controller) {
                const reader = response.body!.getReader();
                const decoder = new TextDecoder();
                let buffer = "";


                console.log("📖 Reading stream...");

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            console.log("✅ Stream done.");
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        console.log("📥 Buffer:", JSON.stringify(buffer));
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;

                            console.log("🔍 Processing line:", trimmed);

                            // Parse Data Stream Protocol
                            // 0: "text"
                            // 9: {"toolCallId":...}

                            const colonIndex = trimmed.indexOf(':');
                            if (colonIndex === -1) {
                                console.log("⚠️ No colon found in line");
                                continue;
                            }

                            const type = trimmed.slice(0, colonIndex);
                            const content = trimmed.slice(colonIndex + 1);

                            console.log("📊 Type:", type, "Content:", content);

                            try {
                                const data = JSON.parse(content);

                                if (type === '0') {
                                    // Text delta
                                    console.log("📤 Enqueuing text-delta:", data);
                                    controller.enqueue({
                                        type: "text-delta",
                                        textDelta: data,
                                    } as any);
                                } else if (type === '9') {
                                    // Tool call
                                    console.log("📤 Enqueuing tool-call:", data.toolName);
                                    controller.enqueue({
                                        type: "tool-call",
                                        toolCallId: data.toolCallId,
                                        toolName: data.toolName,
                                        args: data.args,
                                    } as any);
                                } else {
                                    console.log("⚠️ Unknown type:", type);
                                }
                            } catch (e) {
                                console.error("❌ JSON parse error:", e);
                            }
                        }
                    }

                    controller.close();
                } catch (err) {
                    console.error("❌ Stream error:", err);
                    controller.error(err);
                }
            }
        });
    }

    // Required by ChatTransport interface
    async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
        return null;
    }
}
