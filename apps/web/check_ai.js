const { streamText } = require('ai');
console.log(typeof streamText);
// Mock call to see what it returns
try {
    const result = streamText({
        model: { doStream: async () => ({ stream: new ReadableStream() }) },
        messages: []
    });
    console.log('Result keys:', Object.keys(result));
    console.log('Has toDataStreamResponse:', typeof result.toDataStreamResponse);
} catch (e) {
    console.log('Error:', e.message);
}
