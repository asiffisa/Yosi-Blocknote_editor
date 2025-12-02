/**
 * Test file to validate chunk structure and debug BlockNote AI streaming
 */

// Expected UIMessageChunk format according to Vercel AI SDK
interface UIMessageChunk {
    id: string;
    createdAt: Date;
    role: 'assistant' | 'user' | 'system';
    content: Array<{
        type: 'text';
        text: string;
    }>;
}

// Test chunk creation
function createTestChunk(): UIMessageChunk {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const chunk: UIMessageChunk = {
        id: messageId,
        createdAt: new Date(),
        role: 'assistant',
        content: [{
            type: 'text',
            text: 'Test message'
        }]
    };

    return chunk;
}

// Validation function
function validateChunk(chunk: any): boolean {
    console.log('🧪 [TEST] Validating chunk:', JSON.stringify(chunk, null, 2));

    const errors: string[] = [];

    if (!chunk.id || typeof chunk.id !== 'string') {
        errors.push(`Invalid id: ${chunk.id} (type: ${typeof chunk.id})`);
    }

    if (!chunk.createdAt || !(chunk.createdAt instanceof Date)) {
        errors.push(`Invalid createdAt: ${chunk.createdAt} (type: ${typeof chunk.createdAt})`);
    }

    if (!chunk.role || typeof chunk.role !== 'string') {
        errors.push(`Invalid role: ${chunk.role} (type: ${typeof chunk.role})`);
    }

    if (!Array.isArray(chunk.content)) {
        errors.push(`content is not an array: ${typeof chunk.content}`);
    } else if (chunk.content.length === 0) {
        errors.push('content array is empty');
    } else {
        chunk.content.forEach((item: any, index: number) => {
            if (!item.type || item.type !== 'text') {
                errors.push(`content[${index}].type is invalid: ${item.type}`);
            }
            if (typeof item.text !== 'string') {
                errors.push(`content[${index}].text is not a string: ${typeof item.text}`);
            }
        });
    }

    if (errors.length > 0) {
        console.error('🧪 [TEST] Validation FAILED:', errors);
        return false;
    }

    console.log('🧪 [TEST] Validation PASSED ✅');
    return true;
}

// Run tests
console.log('🧪 [TEST] Starting chunk validation tests...');

const testChunk = createTestChunk();
console.log('🧪 [TEST] Created test chunk:', testChunk);

const isValid = validateChunk(testChunk);
console.log('🧪 [TEST] Test result:', isValid ? 'PASS ✅' : 'FAIL ❌');

// Test chunk serialization/deserialization
const serialized = JSON.stringify(testChunk);
console.log('🧪 [TEST] Serialized chunk:', serialized);

const deserialized = JSON.parse(serialized);
// Note: createdAt will be a string after deserialization, not a Date
deserialized.createdAt = new Date(deserialized.createdAt);
console.log('🧪 [TEST] Deserialized chunk:', deserialized);

const isValidAfterSerialization = validateChunk(deserialized);
console.log('🧪 [TEST] After serialization:', isValidAfterSerialization ? 'PASS ✅' : 'FAIL ❌');

export { createTestChunk, validateChunk };
