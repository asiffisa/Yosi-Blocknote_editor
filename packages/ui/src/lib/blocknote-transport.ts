/**
 * Custom ChatTransport for BlockNote AI integration.
 * Implements both stream() and sendMessages() methods for compatibility.
 */

interface ChatTransport<T> {
    stream(messages: T[], options?: any): AsyncGenerator<string, void, unknown>;
    sendMessages?(options: any): Promise<ReadableStream<any>>;
    reconnectToStream?(options: any): Promise<ReadableStream<any>>;
}

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

    /**
     * Stream method required by BlockNote's ChatTransport interface.
     * Yields text chunks as they arrive from the AI API.
     */
    async *stream(messages: any[], _options?: any): AsyncGenerator<string, void, unknown> {
        console.log('🚀 VercelV5ChatTransport.stream called!');

        const extraBody = this.getExtraBody ? await this.getExtraBody() : {};
        const headers = this.headers ? await this.headers() : {};

        const response = await fetch(this.api, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify({
                ...extraBody,
                messages,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API error:', errorText);
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        if (!response.body) {
            throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    console.log('✅ Stream completed');
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });

                if (chunk) {
                    console.log('📝 Yielding chunk:', chunk.substring(0, 50) + (chunk.length > 50 ? '...' : ''));
                    // Yield plain text directly to BlockNote
                    yield chunk;
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Alternative method that some BlockNote versions call.
     * Returns a ReadableStream of UIMessageChunk objects.
     */
    async sendMessages(options: any): Promise<ReadableStream<any>> {
        console.log('🚀 VercelV5ChatTransport.sendMessages called!');

        const { messages } = options;
        const generator = this.stream(messages, options);
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        let fullText = '';

        // Convert AsyncGenerator to ReadableStream of UIMessageChunk objects
        return new ReadableStream({
            async pull(controller) {
                try {
                    const { done, value } = await generator.next();

                    if (done) {
                        controller.close();
                        return;
                    }

                    // Accumulate text
                    fullText += value;

                    // Create UIMessageChunk object that BlockNote expects
                    const chunk = {
                        type: 'text',
                        id: messageId,
                        createdAt: new Date(),
                        role: 'assistant' as const,
                        content: [
                            {
                                type: 'text' as const,
                                text: fullText
                            }
                        ],
                        parts: [
                            {
                                type: 'text' as const,
                                text: fullText
                            }
                        ]
                    };

                    console.log('📤 Enqueueing chunk:', {
                        type: chunk.type,
                        textLength: fullText.length,
                        textPreview: fullText.substring(0, 50) + '...'
                    });

                    controller.enqueue(chunk);
                } catch (error) {
                    console.error('❌ sendMessages error:', error);
                    controller.error(error);
                }
            },

            cancel() {
                generator.return(undefined);
            }
        });
    }

    /**
     * Reconnect to an existing stream. Required by BlockNote 0.44.0.
     * Returns an empty stream since we don't support reconnection.
     */
    async reconnectToStream(_options: any): Promise<ReadableStream<any>> {
        console.log('🔄 VercelV5ChatTransport.reconnectToStream called (no-op)');
        // Return an empty, immediately closing stream as we don't support reconnection
        return new ReadableStream({
            start(controller) {
                controller.close();
            }
        });
    }
}
