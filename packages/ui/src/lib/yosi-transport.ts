import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
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
    console.log(`[YosiTransport] Creating transport for ${config.provider} with model ${config.model}`);
    console.log(`[YosiTransport] API Key present: ${config.apiKey ? "Yes" : "No"}`);

    let model;

    if (config.provider === "deepseek") {
        // Use OpenAI-compatible provider for DeepSeek (uses /chat/completions endpoint)
        const deepseek = createOpenAICompatible({
            name: "deepseek",
            baseURL: "https://api.deepseek.com/v1",
            fetch: createProxyFetch(config),
            apiKey: "provided-via-proxy",
        });
        model = deepseek.chatModel(config.model);
    } else {
        // Use native OpenAI provider
        model = createOpenAI({
            fetch: createProxyFetch(config),
            baseURL: "https://api.openai.com/v1",
            apiKey: "provided-via-proxy",
        })(config.model);
    }

    return new ClientSideTransport({ model });
}

