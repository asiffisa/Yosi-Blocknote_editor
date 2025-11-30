/**
 * API Key Management Utilities
 * Handles secure storage and retrieval of user API keys with encryption
 */

import CryptoJS from "crypto-js";

// Encryption key - in production, use environment variable
const ENCRYPTION_KEY = typeof window !== 'undefined'
    ? "yosi-encryption-key-v1"
    : process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "yosi-encryption-key-v1";

export type AIProvider = "openai" | "deepseek" | "google" | "grok" | "anthropic";

export interface AISettings {
    provider: AIProvider;
    apiKey: string;
    model?: string;
}

/**
 * Save encrypted API key to localStorage
 */
export function saveApiKey(provider: AIProvider, apiKey: string): void {
    try {
        const encrypted = CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
        localStorage.setItem(`yosi_ai_key_${provider}`, encrypted);
    } catch (error) {
        console.error("Failed to save API key:", error);
        throw new Error("Failed to save API key");
    }
}

/**
 * Retrieve and decrypt API key from localStorage
 */
export function getApiKey(provider: AIProvider): string | null {
    try {
        const encrypted = localStorage.getItem(`yosi_ai_key_${provider}`);
        if (!encrypted) return null;

        const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
        const apiKey = decrypted.toString(CryptoJS.enc.Utf8);
        return apiKey || null;
    } catch (error) {
        console.error("Failed to retrieve API key:", error);
        return null;
    }
}

/**
 * Delete API key from localStorage
 */
export function deleteApiKey(provider: AIProvider): void {
    localStorage.removeItem(`yosi_ai_key_${provider}`);
}

/**
 * Save current provider selection
 */
export function saveCurrentProvider(provider: AIProvider): void {
    localStorage.setItem("yosi_ai_provider", provider);
}

/**
 * Get current provider selection
 */
export function getCurrentProvider(): AIProvider {
    const provider = localStorage.getItem("yosi_ai_provider");
    return (provider as AIProvider) || "deepseek"; // Default to DeepSeek (cheapest)
}

/**
 * Save model selection for a provider
 */
export function saveModel(provider: AIProvider, model: string): void {
    localStorage.setItem(`yosi_ai_model_${provider}`, model);
}

/**
 * Get model selection for a provider
 */
export function getModel(provider: AIProvider): string | null {
    return localStorage.getItem(`yosi_ai_model_${provider}`);
}

/**
 * Get all AI settings
 */
export function getAISettings(): AISettings | null {
    const provider = getCurrentProvider();
    const apiKey = getApiKey(provider);

    if (!apiKey) return null;

    return {
        provider,
        apiKey,
        model: getModel(provider) || undefined,
    };
}

/**
 * Validate API key format for each provider
 */
export function validateApiKeyFormat(provider: AIProvider, apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) return false;

    switch (provider) {
        case "openai":
            return apiKey.startsWith("sk-") && apiKey.length > 20;
        case "deepseek":
            return apiKey.startsWith("sk-") && apiKey.length > 20;
        case "google":
            return apiKey.startsWith("AIza") && apiKey.length > 30;
        case "grok":
            return apiKey.startsWith("xai-") && apiKey.length > 20;
        case "anthropic":
            return apiKey.startsWith("sk-ant-") && apiKey.length > 20;
        default:
            return false;
    }
}

/**
 * Get default model for each provider
 */
export function getDefaultModel(provider: AIProvider): string {
    switch (provider) {
        case "openai":
            return "gpt-4o";
        case "deepseek":
            return "deepseek-chat";
        case "google":
            return "gemini-2.0-flash-exp";
        case "grok":
            return "grok-2-latest";
        case "anthropic":
            return "claude-3-5-sonnet-20241022";
        default:
            return "";
    }
}

/**
 * Get provider display name
 */
export function getProviderName(provider: AIProvider): string {
    switch (provider) {
        case "openai":
            return "OpenAI";
        case "deepseek":
            return "DeepSeek";
        case "google":
            return "Google Gemini";
        case "grok":
            return "Grok (xAI)";
        case "anthropic":
            return "Anthropic Claude";
        default:
            return provider;
    }
}

/**
 * Check if user has any API key configured
 */
export function hasAnyApiKey(): boolean {
    const providers: AIProvider[] = ["openai", "deepseek", "google", "grok", "anthropic"];
    return providers.some(provider => getApiKey(provider) !== null);
}
