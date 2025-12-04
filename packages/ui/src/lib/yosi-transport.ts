import { createOpenAI } from "@ai-sdk/openai";
import { ClientSideTransport } from "@blocknote/xl-ai";

export interface YosiTransportConfig {
    apiKey: string;
    provider: "deepseek" | "openai";
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

        console.log(`[YosiTransport] Proxying request to: ${url}`);

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
    // Determine base URL based on provider
    const baseURL = config.provider === "deepseek"
        ? "https://api.deepseek.com/v1"
        : "https://api.openai.com/v1";

    console.log(`[YosiTransport] Creating transport for ${config.provider} with model ${config.model}`);
    console.log(`[YosiTransport] API Key present: ${config.apiKey ? "Yes" : "No"}`);

    // Create AI SDK model with custom proxy fetch
    const model = createOpenAI({
        fetch: createProxyFetch(config),
        baseURL,
        apiKey: "provided-via-proxy", // Placeholder - actual key is in headers
    })(config.model);

    return new ClientSideTransport({ model });
}


