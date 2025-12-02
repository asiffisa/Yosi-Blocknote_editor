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
        console.log('🔍 [TRANSPORT] Number of messages:', messages?.length);
        console.log('🔍 [TRANSPORT] Message details:');
        messages?.forEach((msg: any, index: number) => {
            const contentStr = msg.content
                ? (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))
                : '<undefined>';

            console.log(`  Message ${index + 1}:`, {
                role: msg.role,
                content: msg.content,
                contentType: typeof msg.content,
                contentLength: typeof msg.content === 'string' ? msg.content.length : 'N/A',
                contentPreview: contentStr.substring(0, 100),
            });
        });

        const extraBody = this.getExtraBody ? await this.getExtraBody() : {};
        const headers = this.headers ? await this.headers() : {};

        const requestBody = {
            ...extraBody,
            ...(body || {}),
            messages,
        };

        console.log('🔍 [TRANSPORT] Request body being sent to API:', JSON.stringify({
            ...requestBody,
            userApiKey: requestBody.userApiKey ? '***REDACTED***' : undefined,
        }, null, 2));

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
     * Properly accumulates text and yields UIMessageChunk format
     */
    private parseTextStream(response: Response): ReadableStream<any> {
        const responseBody = response.body;
        if (!responseBody) throw new Error('No response body');

        const decoder = new TextDecoder();
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        let hasErrored = false;
        let fullText = ''; // Accumulate full text
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        console.log('🔧 [TRANSPORT DEBUG] Starting stream parse with messageId:', messageId);

        return new ReadableStream({
            async start() {
                reader = responseBody.getReader();
                console.log('🔧 [TRANSPORT DEBUG] Reader initialized');
            },

            async pull(controller) {
                if (!reader) {
                    console.error('🔧 [TRANSPORT DEBUG] Reader not initialized!');
                    controller.error(new Error('Reader not initialized'));
                    hasErrored = true;
                    return;
                }

                try {
                    const { done, value } = await reader.read();

                    if (done) {
                        console.log('🔧 [TRANSPORT DEBUG] Stream done, final text:', fullText);
                        if (!hasErrored) {
                            try {
                                controller.close();
                                console.log('🔧 [TRANSPORT DEBUG] Controller closed successfully');
                            } catch (e) {
                                console.warn('Could not close controller:', e);
                            }
                        }
                        return;
                    }

                    // Decode the text chunk
                    const textChunk = decoder.decode(value, { stream: true });

                    if (textChunk) {
                        // Accumulate text
                        fullText += textChunk;

                        console.log('📥 Text chunk:', textChunk);
                        console.log('📝 Full accumulated text:', fullText);

                        // ✅ Build proper UIMessageChunk with ALL required properties
                        // CRITICAL: BlockNote expects BOTH 'content' AND 'parts' for proper UI rendering
                        const textPart = {
                            type: 'text' as const,
                            text: fullText
                        };

                        const chunk = {
                            type: '0', // '0' = text chunk in Data Stream Protocol
                            id: messageId,
                            createdAt: new Date(),
                            role: 'assistant' as const,
                            content: [textPart], // For Vercel AI SDK
                            parts: [textPart],   // For BlockNote UI SDK (CRITICAL!)
                        };

                        // 🔍 DEBUG: Log the exact chunk structure being enqueued
                        console.log('🔧 [TRANSPORT DEBUG] Chunk structure:', JSON.stringify({
                            type: chunk.type,
                            id: chunk.id,
                            createdAt: chunk.createdAt.toISOString(),
                            role: chunk.role,
                            content: chunk.content,
                            parts: chunk.parts,
                            hasParts: !!chunk.parts,
                            hasContent: !!chunk.content,
                            typeofType: typeof chunk.type,
                            typeofId: typeof chunk.id,
                            typeofRole: typeof chunk.role,
                            isContentArray: Array.isArray(chunk.content),
                            isPartsArray: Array.isArray(chunk.parts),
                        }, null, 2));

                        // Validate chunk structure before enqueuing
                        if (!chunk.type || typeof chunk.type !== 'string') {
                            console.error('🔧 [TRANSPORT DEBUG] Invalid chunk.type:', chunk.type);
                        }
                        if (!chunk.id || typeof chunk.id !== 'string') {
                            console.error('🔧 [TRANSPORT DEBUG] Invalid chunk.id:', chunk.id);
                        }
                        if (!chunk.role) {
                            console.error('🔧 [TRANSPORT DEBUG] Invalid chunk.role:', chunk.role);
                        }
                        if (!Array.isArray(chunk.content) || chunk.content.length === 0) {
                            console.error('🔧 [TRANSPORT DEBUG] Invalid chunk.content:', chunk.content);
                        }
                        if (!Array.isArray(chunk.parts) || chunk.parts.length === 0) {
                            console.error('🔧 [TRANSPORT DEBUG] Invalid chunk.parts:', chunk.parts);
                        }

                        controller.enqueue(chunk);
                        console.log('🔧 [TRANSPORT DEBUG] Chunk enqueued successfully with type:', chunk.type, 'and parts:', chunk.parts.length);
                    }
                } catch (error) {
                    console.error('🔧 [TRANSPORT DEBUG] Stream error:', error);
                    console.error('🔧 [TRANSPORT DEBUG] Error stack:', (error as Error).stack);
                    hasErrored = true;
                    controller.error(error);
                }
            },

            cancel(reason) {
                console.log('🔧 [TRANSPORT DEBUG] Stream cancelled:', reason);
                if (reader) {
                    reader.cancel(reason).catch(() => {
                        // Ignore cancel errors
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
