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
        console.log("✅ Creating pull-based ReadableStream for BlockNote");

        // Queue to hold parsed chunks until pull() is called
        const chunkQueue: UIMessageChunk[] = [];
        let isStreamFinished = false;
        let streamError: Error | null = null;
        let pullResolver: (() => void) | null = null;

        // Type guard to help TypeScript
        const notifyPull = () => {
            if (pullResolver) {
                const resolver = pullResolver;
                pullResolver = null;
                resolver();
            }
        };

        // Start background task to read from HTTP response and parse chunks
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Background task to consume HTTP response and fill the queue
        (async () => {
            try {
                console.log("🔄 Background task: Starting to read HTTP response stream");
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        console.log("✅ Background task: HTTP stream finished");
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (!line.trim()) continue;

                        // Handle Vercel AI SDK Data Stream Protocol
                        // Format: "0:{string}" (text), "1:{json}" (tool call), etc.
                        // Also handles SSE format: "data: {json}"

                        console.log("🔹 Background task: Raw line:", line);

                        if (line.trim() === 'data: [DONE]') {
                            console.log("✅ Background task: Stream finished (legacy marker)");
                            continue;
                        }

                        let chunk: UIMessageChunk | null = null;

                        // Check for SSE format first (data: prefix)
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.slice(6).trim();
                            if (jsonStr === '[DONE]') {
                                console.log("✅ Background task: Stream finished (SSE marker)");
                                continue;
                            }
                            try {
                                let parsedChunk: any;
                                try {
                                    parsedChunk = JSON.parse(jsonStr);
                                } catch (parseError) {
                                    console.error("❌ Background task: Failed to parse JSON from SSE line:", jsonStr, parseError);
                                    continue;
                                }

                                // Log the parsed chunk for debugging
                                if (!parsedChunk || typeof parsedChunk !== 'object') {
                                    console.warn("⚠️ Background task: Parsed chunk is not an object:", parsedChunk, "from line:", line);
                                    continue;
                                }

                                // Check if chunk is already in UIMessageChunk format or needs conversion
                                if (parsedChunk.type) {
                                    // Handle error chunks specially
                                    if (parsedChunk.type === 'error') {
                                        const errorText = parsedChunk.errorText || parsedChunk.message || parsedChunk.error || "Stream error";
                                        console.error("❌ Background task: Stream error chunk from SSE:", {
                                            type: parsedChunk.type,
                                            errorText: errorText,
                                            fullChunk: parsedChunk
                                        });
                                        streamError = new Error(errorText);
                                        // Also pass through the error chunk so BlockNote can handle it
                                        chunk = parsedChunk as any;
                                    } else {
                                        // Map delta to textDelta if needed
                                        if (parsedChunk.type === 'text-delta' && parsedChunk.delta && !parsedChunk.textDelta) {
                                            parsedChunk.textDelta = parsedChunk.delta;
                                        }
                                        // Pass through control chunks like 'start', 'finish', etc.
                                        chunk = parsedChunk as any;
                                    }
                                } else if (typeof parsedChunk === 'string') {
                                    // Sometimes it's just the text
                                    chunk = {
                                        type: 'text-delta',
                                        textDelta: parsedChunk,
                                        id: "msg_" + Date.now()
                                    } as any;
                                } else {
                                    // Unknown object, assume it might be a text delta if it has content
                                    // or just log it
                                    console.log("⚠️ Background task: Unknown SSE object:", parsedChunk);
                                }
                            } catch (e) {
                                // If it's not JSON, maybe it's just text?
                                console.warn("⚠️ Background task: Failed to parse SSE data as JSON:", jsonStr, e);
                            }
                        } else {
                            // Handle Vercel AI SDK Data Stream Protocol format: "0:{string}", "1:{json}", etc.
                            const firstColonIndex = line.indexOf(':');
                            if (firstColonIndex !== -1) {
                                const type = line.slice(0, firstColonIndex);
                                const content = line.slice(firstColonIndex + 1).trim();

                                try {
                                    // The content is JSON encoded
                                    const value = JSON.parse(content);

                                    if (type === '0') {
                                        // Text delta
                                        chunk = {
                                            type: 'text-delta',
                                            textDelta: value, // Use textDelta as per AI SDK types
                                            id: "msg_" + Date.now()
                                        } as any;
                                    } else if (type === '1') {
                                        // Tool call
                                        chunk = {
                                            type: 'tool-call',
                                            toolCallId: value.toolCallId,
                                            toolName: value.toolName,
                                            args: value.args
                                        } as any;
                                    } else if (type === '2') {
                                        // Tool result
                                        chunk = {
                                            type: 'tool-result',
                                            toolCallId: value.toolCallId,
                                            result: value.result
                                        } as any;
                                    } else if (type === '3') {
                                        // Error
                                        console.error("❌ Background task: Stream error chunk:", value);
                                        streamError = new Error(value.message || "Stream error");
                                    } else {
                                        console.log("⚠️ Background task: Unknown data stream type:", type);
                                    }
                                } catch (e) {
                                    console.warn("⚠️ Background task: Failed to parse stream data:", line, e);
                                }
                            }
                        }

                        if (chunk) {
                            const textDelta = (chunk as any).textDelta;
                            console.log("📦 Background task: Enqueued chunk to queue:", chunk.type, textDelta ? `(textDelta: "${textDelta}")` : '');
                            chunkQueue.push(chunk);
                            // Notify pull() if it's waiting
                            notifyPull();
                        }
                    }
                }

                isStreamFinished = true;
                console.log("✅ Background task: Finished, queue has", chunkQueue.length, "chunks");
                // Notify pull() that stream is finished
                notifyPull();
            } catch (err) {
                console.error("❌ Background task: Stream error:", err);
                streamError = err instanceof Error ? err : new Error(String(err));
                isStreamFinished = true;
                notifyPull();
            }
        })();

        // Create ReadableStream with pull() method for lazy consumption
        return new ReadableStream<UIMessageChunk>({
            async pull(controller) {
                console.log("🔍 BackendTransport: Stream pull() called!");

                // If there's an error, propagate it
                if (streamError) {
                    console.error("❌ BackendTransport: Propagating stream error:", streamError);
                    controller.error(streamError);
                    return;
                }

                // If queue has chunks, dequeue and enqueue to controller
                if (chunkQueue.length > 0) {
                    const chunk = chunkQueue.shift()!;
                    console.log("📤 BackendTransport: Dequeuing and enqueueing chunk:", chunk.type);
                    controller.enqueue(chunk);
                    return;
                }

                // If stream is finished and queue is empty, close
                if (isStreamFinished) {
                    console.log("✅ BackendTransport: Stream finished, closing controller");
                    controller.close();
                    return;
                }

                // Queue is empty but stream is still active, wait for more chunks
                console.log("⏳ BackendTransport: Queue empty, waiting for more chunks...");
                await new Promise<void>((resolve) => {
                    pullResolver = resolve;
                });

                // After waiting, try again
                if (chunkQueue.length > 0) {
                    const chunk = chunkQueue.shift()!;
                    console.log("📤 BackendTransport: After wait, dequeuing chunk:", chunk.type);
                    controller.enqueue(chunk);
                } else if (isStreamFinished) {
                    console.log("✅ BackendTransport: Stream finished after wait, closing");
                    controller.close();
                } else if (streamError) {
                    console.error("❌ BackendTransport: Error after wait:", streamError);
                    controller.error(streamError);
                }
            },

            cancel(reason) {
                console.log("🚫 BackendTransport: Stream cancelled:", reason);
                reader.cancel(reason).catch((e) => {
                    console.warn("⚠️ BackendTransport: Error cancelling reader:", e);
                });
            }
        });
    }

    // Required by ChatTransport interface
    async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
        return null;
    }
}
