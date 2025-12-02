/**
 * Convert BlockNote messages to AI SDK CoreMessage format
 * BlockNote sends: { role: string, content: string | Array<{type, text}> }
 * AI SDK needs:   { role: string, content: string | Array<{type: 'text', text}> }
 */
export function convertToCoreMessages(messages: any[]) {
    return messages
        .map((msg) => {
            // Validate role
            if (!['system', 'user', 'assistant', 'tool'].includes(msg.role)) {
                console.warn(`Invalid role: ${msg.role}, skipping`);
                return null;
            }

            let content: string | Array<{ type: 'text'; text: string }>;

            // Handle string content
            if (typeof msg.content === 'string') {
                content = msg.content;
            }
            // Handle array content (parts)
            else if (Array.isArray(msg.content)) {
                const validParts = msg.content
                    .filter((part: any) => {
                        if (typeof part === 'string') return true;
                        if (part?.type === 'text' && part?.text) return true;
                        return false;
                    })
                    .map((part: any) => ({
                        type: 'text' as const,
                        text: typeof part === 'string' ? part : (part.text || ''),
                    }));

                // Use parts if valid, otherwise empty string
                content = validParts.length > 0 ? validParts : '';
            }
            // Fallback
            else {
                content = '';
            }

            // Skip messages with empty content
            if (!content) {
                console.warn('Empty content message:', msg);
                return null;
            }

            return {
                role: msg.role,
                content,
            };
        })
        .filter((msg) => msg !== null); // Remove null entries
}
