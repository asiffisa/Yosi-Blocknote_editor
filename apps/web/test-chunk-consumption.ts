// Test script to check what BlockNote is actually receiving
// Run in browser console on the editor page

console.log('🧪 Simulating BlockNote chunk consumption...');

async function testBlockNoteChunkConsumption() {
    const transport = new (await import('@yosi/ui/lib/blocknote-transport')).OptimizedBlockNoteTransport({
        api: '/api/ai/chat',
        headers: async () => ({ 'Content-Type': 'application/json' }),
        getExtraBody: async () => ({
            userApiKey: localStorage.getItem('ai-api-key') || 'test',
            provider: localStorage.getItem('ai-provider') || 'openai',
            model: localStorage.getItem('ai-model') || 'gpt-4o',
        }),
    });

    const stream = await transport.sendMessages({
        messages: [{ role: 'user', content: 'Say hello' }]
    });

    console.log('🧪 Stream type:', stream.constructor.name);
    console.log('🧪 Is ReadableStream?', stream instanceof ReadableStream);

    // Test 1: Direct consumption
    const reader = stream.getReader();
    let chunkCount = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunkCount++;
            console.log(`🧪 Chunk #${chunkCount}:`, value);

            // Check if BlockNote would accept this format
            if (!value.type) console.error('❌ Missing type field');
            if (!value.content && !value.parts) console.error('❌ Missing content/parts field');
        }

        console.log(`✅ Consumed ${chunkCount} chunks successfully`);
    } catch (error) {
        console.error('❌ Error consuming stream:', error);
    }
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testBlockNoteChunkConsumption = testBlockNoteChunkConsumption;
}

export { testBlockNoteChunkConsumption };
