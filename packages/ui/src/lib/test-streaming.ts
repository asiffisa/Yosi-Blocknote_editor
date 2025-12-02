/**
 * Comprehensive streaming test to identify root cause
 */
import { OptimizedBlockNoteTransport } from '@yosi/ui/lib/blocknote-transport';

async function testStreaming() {
    console.log('🧪 [STREAMING TEST] Starting comprehensive streaming test...');

    const transport = new OptimizedBlockNoteTransport({
        api: '/api/ai/chat',
        headers: async () => ({
            'Content-Type': 'application/json',
        }),
        getExtraBody: async () => ({
            userApiKey: 'test-key',
            provider: 'openai',
            model: 'gpt-4o',
        }),
    });

    const testMessages = [
        { role: 'user', content: 'Say hello' }
    ];

    console.log('🧪 [STREAMING TEST] Calling sendMessages with:', testMessages);

    try {
        const stream = await transport.sendMessages({ messages: testMessages });
        console.log('🧪 [STREAMING TEST] Stream created:', stream);
        console.log('🧪 [STREAMING TEST] Stream type:', typeof stream);
        console.log('🧪 [STREAMING TEST] Is ReadableStream?:', stream instanceof ReadableStream);

        const reader = stream.getReader();
        console.log('🧪 [STREAMING TEST] Reader acquired');

        let chunkCount = 0;
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                console.log('🧪 [STREAMING TEST] Stream complete. Total chunks:', chunkCount);
                break;
            }

            chunkCount++;
            console.log(`🧪 [STREAMING TEST] Chunk #${chunkCount}:`, JSON.stringify(value, null, 2));

            // Validate chunk structure
            console.log(`🧪 [STREAMING TEST] Chunk #${chunkCount} validation:`);
            console.log('  - Has id?', !!value?.id, '| Value:', value?.id);
            console.log('  - Has createdAt?', !!value?.createdAt, '| Type:', typeof value?.createdAt);
            console.log('  - Has role?', !!value?.role, '| Value:', value?.role);
            console.log('  - Has content?', !!value?.content, '| IsArray:', Array.isArray(value?.content));

            if (value?.content && Array.isArray(value.content) && value.content.length > 0) {
                console.log('  - content[0].type:', value.content[0]?.type);
                console.log('  - content[0].text:', value.content[0]?.text);
            }
        }

        console.log('🧪 [STREAMING TEST] Test completed successfully ✅');

    } catch (error) {
        console.error('🧪 [STREAMING TEST] Test failed ❌:', error);
        console.error('🧪 [STREAMING TEST] Error details:', {
            message: (error as Error).message,
            stack: (error as Error).stack,
        });
    }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
    (window as any).testStreaming = testStreaming;
    console.log('🧪 [STREAMING TEST] Test function registered. Run: window.testStreaming()');
}

export { testStreaming };
