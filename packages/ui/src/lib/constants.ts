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
 * Model options for each provider
 */
export const MODEL_OPTIONS: Record<Provider, { value: string; label: string }[]> = {
    deepseek: [
        { value: "deepseek-chat", label: "DeepSeek-V3" },
        { value: "deepseek-reasoner", label: "DeepSeek-Reasoning" },
    ],
    openai: [
        { value: "gpt-4o", label: "GPT-4o" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "gpt-4", label: "GPT-4" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    google: [
        { value: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro (Latest)" },
        { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash (Latest)" },
        { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Fixed)" },
        { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Fixed)" },
    ],
};
