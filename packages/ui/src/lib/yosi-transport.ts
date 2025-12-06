import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ClientSideTransport } from "@blocknote/xl-ai";

export interface YosiTransportConfig {
    apiKey: string;
    provider: "deepseek" | "openai" | "google";
    model: string;
}

/**
 * Creates a custom fetch function that routes through our proxy
 * and adds the API key header
 */
function createProxyFetch(config: YosiTransportConfig): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.toString();
        const proxyUrl = `/api/ai/proxy?provider=${config.provider}&url=${encodeURIComponent(url)}`;

        return fetch(proxyUrl, {
            ...init,
            headers: {
                ...init?.headers,
                "X-API-Key": config.apiKey,
            },
        });
    };
}

/**
 * Creates a configured ClientSideTransport for Yosi AI
 * Uses BlockNote's ClientSideTransport with custom proxy fetch
 * Routes requests through our proxy to securely add API key
 */
export function createYosiTransport(config: YosiTransportConfig) {
    let model;

    if (config.provider === "google") {
        const google = createGoogleGenerativeAI({
            fetch: createProxyFetch(config),
            apiKey: "provided-via-proxy", // Placeholder, actual key added by proxy
        });
        model = google(config.model);
    } else {
        // Use OpenAI-compatible provider for both DeepSeek and OpenAI
        // This ensures consistent behavior and proper proxy handling
        const provider = createOpenAICompatible({
            name: config.provider,
            baseURL: config.provider === "deepseek"
                ? "https://api.deepseek.com/v1"
                : "https://api.openai.com/v1",
            fetch: createProxyFetch(config),
            apiKey: "provided-via-proxy",
        });

        model = provider.chatModel(config.model);
    }

    return new ClientSideTransport({ model });
}
