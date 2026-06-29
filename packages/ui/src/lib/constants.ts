/**
 * Shared constants for Yosi application
 */

/**
 * LocalStorage keys for AI configuration
 */
export const LOCAL_STORAGE_KEYS = {
    PROVIDER: "yosi_ai_provider",
    MODEL: "yosi_ai_model",
    API_KEY: "yosi_ai_api_key",
} as const;

/**
 * Custom event name for AI configuration updates
 */
export const AI_CONFIG_EVENT = "yosi_ai_config_updated";

/**
 * Supported AI providers
 */
export const SUPPORTED_PROVIDERS = ["deepseek", "openai", "google"] as const;
export type Provider = typeof SUPPORTED_PROVIDERS[number];

/**
 * Default AI configuration
 */
export const DEFAULT_AI_CONFIG = {
    provider: "deepseek" as Provider,
    model: "deepseek-chat",
    apiKey: "",
} as const;

/**
 * Model options for each provider.
 *
 * Ordered cheapest-first: the first entry is used as the default when a
 * provider is selected (see ApiKeyDialog / useAIConfig), so it should be the
 * most cost-effective current-generation model. Model IDs are stable provider
 * aliases that track the latest snapshot where possible — verify availability
 * against each provider's pricing/models page before relying on them.
 */
export const MODEL_OPTIONS: Record<Provider, { value: string; label: string }[]> = {
    // https://api-docs.deepseek.com/quick_start/pricing
    deepseek: [
        { value: "deepseek-chat", label: "DeepSeek-V3 (Chat)" },
        { value: "deepseek-reasoner", label: "DeepSeek-R1 (Reasoner)" },
    ],
    // https://platform.openai.com/docs/pricing
    openai: [
        { value: "gpt-4o-mini", label: "GPT-4o mini (cheapest)" },
        { value: "gpt-4.1-nano", label: "GPT-4.1 nano" },
        { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
        { value: "gpt-4.1", label: "GPT-4.1" },
        { value: "gpt-4o", label: "GPT-4o" },
    ],
    // https://ai.google.dev/gemini-api/docs/pricing
    google: [
        { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite (cheapest)" },
        { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
        { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
        { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
};
