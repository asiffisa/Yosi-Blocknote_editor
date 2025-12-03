// Remove import from @blocknote/xl-ai as it might not export ChatTransport in this version
// import { ChatTransport } from "@blocknote/xl-ai";

/**
 * Custom ChatTransport interface to match BlockNote's expected structure.
 */
interface ChatTransport<T> {
    stream(messages: T[], options?: any): AsyncGenerator<string, void, unknown>;
    sendMessages?(options: any): Promise<ReadableStream<any>>;
}

/**
 * Custom ChatTransport for BlockNote AI integration.
 * Implements both stream() and sendMessages() methods for compatibility.
 * Handles Vercel Data Stream Protocol (e.g. 0:"text", 9:{tool}).
 */
export class VercelV5ChatTransport implements ChatTransport<any> {
    private api: string;
    private headers?: () => Promise<Record<string, string>>;
    private getExtraBody?: () => Promise<Record<string, any>>;
    private editor: any = null;

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
     * Sets the editor instance to allow tool execution.
     */
    public setEditor(editor: any) {
        this.editor = editor;
    }

    /**
     * Stream method required by BlockNote's ChatTransport interface.
     * Yields text chunks as they arrive from the AI API.
     */
    async *stream(messages: any[], options?: any): AsyncGenerator<string, void, unknown> {
        console.log('🚀 VercelV5ChatTransport.stream called!');
        if (options) {
            console.log("Stream options:", JSON.stringify(options, null, 2));
        }

        const extraBody = this.getExtraBody ? await this.getExtraBody() : {};
        const headers = this.headers ? await this.headers() : {};

        // Merge extra body, messages, and any options that might contain toolDefinitions
        // If BlockNote passes toolDefinitions in options, we should include them.
        const body: any = {
            ...extraBody,
            messages,
        };

        // If toolDefinitions are in options, add them to body
        // Note: The exact property name from BlockNote is likely 'toolDefinitions' or 'tools'
        if (options && options.toolDefinitions) {
            body.toolDefinitions = options.toolDefinitions;
        }

        const response = await fetch(this.api, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(body),
        });

        if (!response.body) {
            throw new Error('No response body');
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API error:', errorText);
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    if (buffer.trim()) {
                        yield* this.parseBlock(buffer);
                    }
                    console.log('✅ Stream completed');
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Keep the last line in buffer as it might be incomplete
                buffer = lines.pop() || '';

                for (const line of lines) {
                    yield* this.parseBlock(line);
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Helper to parse a single line of the Data Stream Protocol.
     */
    private *parseBlock(line: string): Generator<string, void, unknown> {
        if (!line.trim()) return;

        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1) return;

        const type = line.slice(0, separatorIndex);
        const content = line.slice(separatorIndex + 1);

        switch (type) {
            case '0': // Text Delta
                try {
                    const textDelta = JSON.parse(content);
                    if (typeof textDelta === 'string') {
                        yield textDelta;
                    }
                } catch (e) {
                    console.warn("VercelV5ChatTransport: Failed to parse text delta", content, e);
                }
                break;

            case '9': // Tool Call
                console.debug("VercelV5ChatTransport: Tool Call detected", content);
                try {
                     const toolCall = JSON.parse(content);
                     console.log("Tool call payload:", toolCall);

                     // If we have the editor and this is the document operation tool
                     // We can try to execute it.
                     // The tool name for BlockNote is usually specific.
                     // We need to inspect `toolCall` structure: { toolCallId: string, toolName: string, args: object }

                     if (this.editor) {
                        // TODO: Implement tool execution mapping.
                        // The tool payload structure and editor methods need to be matched.
                        // Typically, if toolName corresponds to a BlockNote operation, we can dispatch it.
                        // Example:
                        // if (toolCall.toolName === 'applyDocumentOperations') {
                        //     // Execute operations on editor
                        // }
                        console.log("Received tool call for editor. Execution implementation pending tool name verification.", toolCall.toolName);
                     }
                } catch (e) {
                    console.error("Failed to parse tool call", e);
                }
                break;

            case 'e': // Server Error
                console.error("VercelV5ChatTransport: Server sent error", content);
                break;

            default:
                // Ignore other types (8: data, a: tool result, d: reasoning)
                break;
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
}
