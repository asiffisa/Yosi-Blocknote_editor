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
    model: "deepseek-v4-flash",
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
    deepseek: [
        { value: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
        { value: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
    ],
    openai: [
        { value: "gpt-5.4-mini", label: "GPT-5.4 mini" },
        { value: "gpt-5-nano", label: "GPT-5 nano" },
    ],
    google: [
        { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
        { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
    ],
};
