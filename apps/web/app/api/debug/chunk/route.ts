/**
 * Test endpoint to check chunk format
 */
export async function GET() {
    const testChunk = {
        id: `msg_test_${Date.now()}`,
        createdAt: new Date(),
        role: 'assistant',
        content: [{
            type: 'text',
            text: 'Test message from debug endpoint'
        }]
    };

    console.log('🧪 [DEBUG API] Test chunk:', JSON.stringify(testChunk, null, 2));
    console.log('🧪 [DEBUG API] Chunk validation:');
    console.log('  - id:', testChunk.id, 'typeof:', typeof testChunk.id);
    console.log('  - createdAt:', testChunk.createdAt, 'typeof:', typeof testChunk.createdAt);
    console.log('  - role:', testChunk.role, 'typeof:', typeof testChunk.role);
    console.log('  - content:', testChunk.content, 'isArray:', Array.isArray(testChunk.content));
    console.log('  - content[0].type:', testChunk.content[0]?.type);
    console.log('  - content[0].text:', testChunk.content[0]?.text);

    return new Response(JSON.stringify(testChunk, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}
