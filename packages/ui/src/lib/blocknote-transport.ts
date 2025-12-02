import type { ChatTransport } from 'ai';

/**
 * Custom ChatTransport for Vercel AI SDK v5 compatibility.
 * This transport decodes the "Data Stream Protocol" (e.g. 0:"text", 9:{tool})
 * and yields UIMessageChunk objects with accumulated text to BlockNote.
 */
export class VercelV5ChatTransport implements ChatTransport<any> {
    private api: string;
    private headers?: () => Promise<Record<string, string>>;
    private getExtraBody?: () => Promise<Record<string, any>>;

    constructor(options: {
        api: string;
        headers?: () => Promise<Record<string, string>>;
        getExtraBody?: () => Promise<Record<string, any>>;
    }) {
        this.api = options.api;
        this.headers = options.headers;
        this.getExtraBody = options.getExtraBody;
    }

    async sendMessages(options: any): Promise<ReadableStream<any>> {
        const { messages, body } = options;
        console.log('🚀 VercelV5ChatTransport.sendMessages called!');

        const extraBody = this.getExtraBody ? await this.getExtraBody() : {};
        const headers = this.headers ? await this.headers() : {};

        const requestBody = {
            ...extraBody,
            ...(body || {}),
            messages,
        };

        const response = await fetch(this.api, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            let errorMessage = `API error: ${response.status}`;
            try {
                const errorBody = await response.text();
                console.error('❌ Server error:', errorBody);
                errorMessage = `${errorMessage} - ${errorBody}`;
            } catch (e) {
                // ignore
            }
            throw new Error(errorMessage);
        }

        if (!response.body) throw new Error('No response body');

        return this.parseDataStream(response.body);
    }

    async reconnectToStream(): Promise<any> {
        return null;
    }

    /**
     * Parse Vercel Data Stream Protocol and yield UIMessageChunks
     */
    private parseDataStream(stream: ReadableStream<Uint8Array>): ReadableStream<any> {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = ''; // Accumulate text to match BlockNote expectation
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        return new ReadableStream({
            async start() {
                //
            },

            async pull(controller) {
                try {
                    const { done, value } = await reader.read();

                    if (done) {
                        console.log('VercelV5ChatTransport: Stream done');
                        if (buffer.trim()) {
                            processBuffer(buffer);
                        }
                        controller.close();
                        return;
                    }

                    const chunkStr = decoder.decode(value, { stream: true });
                    console.log('VercelV5ChatTransport: Received chunk:', JSON.stringify(chunkStr));
                    buffer += chunkStr;

                    // Split by newline, but keep the last part in buffer if it's incomplete
                    const lines = buffer.split('\n');

                    // If the last character was a newline, the last element is empty string.
                    // If not, the last element is the incomplete line.
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        processBuffer(line);
                    }

                    function processBuffer(line: string) {
                        if (!line.trim()) return;

                        // Try to detect protocol format
                        const separatorIndex = line.indexOf(':');

                        if (separatorIndex !== -1) {
                            const type = line.slice(0, separatorIndex);
                            const content = line.slice(separatorIndex + 1);

                            if (type === '0') { // Text Delta
                                try {
                                    const textDelta = JSON.parse(content);
                                    if (typeof textDelta === 'string') {
                                        fullText += textDelta;

                                        // Construct the chunk object expected by BlockNote (UIMessage)
                                        // BlockNote expects content to be an array of parts with type 'text'
                                        const textPart = {
                                            type: 'text' as const,
                                            text: fullText
                                        };

                                        const chunk = {
                                            type: 'text', // Add type to prevent crash in isDataUIMessageChunk
                                            id: messageId,
                                            createdAt: new Date(),
                                            role: 'assistant' as const,
                                            content: [textPart],
                                            parts: [textPart],
                                        };

                                        controller.enqueue(chunk);
                                    }
                                } catch (e) {
                                    // Ignore parse errors
                                }
                            }
                            // Ignore other types (tool calls, etc.) for now as we just want text streaming to work first
                        }
                    }

                } catch (error) {
                    controller.error(error);
                }
            },

            cancel() {
                reader.cancel();
            }
        });
    }
}
