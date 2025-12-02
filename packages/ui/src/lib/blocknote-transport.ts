import type { ChatTransport } from 'ai';

/**
 * Optimized BlockNote Transport for plain text streaming
 * Properly manages reader lifecycle without lock errors
 */
export class OptimizedBlockNoteTransport implements ChatTransport<any> {
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
        console.log('🚀 OptimizedBlockNoteTransport.sendMessages called!');
        console.log('📨 Messages:', messages);

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

        // Parse the plain text stream from toTextStreamResponse()
        return this.parseTextStream(response);
    }

    /**
     * Parse plain text stream from toTextStreamResponse()
     * Converts plain text deltas into UIMessageChunk format
     * Properly manages reader lifecycle
     */
    private parseTextStream(response: Response): ReadableStream<any> {
        const responseBody = response.body;
        if (!responseBody) throw new Error('No response body');

        const decoder = new TextDecoder();
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        let hasErrored = false; // Track if stream has errored

        return new ReadableStream({
            async start() {
                // Get reader in start() to ensure it's available
                reader = responseBody.getReader();
            },

            async pull(controller) {
                if (!reader) {
                    controller.error(new Error('Reader not initialized'));
                    hasErrored = true;
                    return;
                }

                try {
                    const { done, value } = await reader.read();

                    if (done) {
                        // Only close if stream hasn't errored
                        if (!hasErrored) {
                            try {
                                controller.close();
                            } catch (e) {
                                // Stream might already be closed or errored
                                console.warn('Could not close controller:', e);
                            }
                        }
                        return;
                    }

                    // Decode the text chunk
                    const text = decoder.decode(value, { stream: true });

                    if (text) {
                        console.log('📥 Text chunk:', text);
                        // Yield properly structured UIMessageChunk
                        controller.enqueue({
                            id: `msg_${Date.now()}`,
                            type: 'text-delta',
                            content: [{
                                type: 'text',
                                text: text
                            }]
                        });
                    }
                } catch (error) {
                    console.error('Stream error:', error);
                    hasErrored = true;
                    controller.error(error);
                }
            },

            cancel(reason) {
                // Properly close the reader if it exists
                if (reader) {
                    reader.cancel(reason).catch(() => {
                        // Ignore cancel errors - reader may already be released
                    }).finally(() => {
                        reader = null;
                    });
                }
            }
        });
    }

    async reconnectToStream(): Promise<any> {
        return null;
    }
}
