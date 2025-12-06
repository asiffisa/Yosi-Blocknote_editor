"use client";

import { useState, useEffect } from "react";
import {
    LOCAL_STORAGE_KEYS,
    AI_CONFIG_EVENT,
    DEFAULT_AI_CONFIG,
    MODEL_OPTIONS,
    type Provider,
} from "./constants";

/**
 * AI Configuration state type
 */
export interface AIConfig {
    apiKey: string;
    provider: Provider;
    model: string;
}

/**
 * Return type for useAIConfig hook
 */
export interface UseAIConfigResult {
    config: AIConfig;
    loaded: boolean;
}

/**
 * Custom hook for managing AI configuration
 * Loads from localStorage and listens for configuration updates
 */
export function useAIConfig(): UseAIConfigResult {
    const [config, setConfig] = useState<AIConfig>({
        apiKey: DEFAULT_AI_CONFIG.apiKey,
        provider: DEFAULT_AI_CONFIG.provider,
        model: DEFAULT_AI_CONFIG.model,
    });
    const [loaded, setLoaded] = useState(false);

    const loadConfig = () => {
        if (typeof window === "undefined") return;

        const savedProvider = localStorage.getItem(LOCAL_STORAGE_KEYS.PROVIDER) as Provider | null;
        const savedModel = localStorage.getItem(LOCAL_STORAGE_KEYS.MODEL);
        const savedApiKey = localStorage.getItem(LOCAL_STORAGE_KEYS.API_KEY);

        const provider = savedProvider && MODEL_OPTIONS[savedProvider]
            ? savedProvider
            : DEFAULT_AI_CONFIG.provider;

        const providerModels = MODEL_OPTIONS[provider].map(m => m.value);
        const model = savedModel && providerModels.includes(savedModel)
            ? savedModel
            : providerModels[0];

        setConfig({
            apiKey: savedApiKey || "",
            provider,
            model,
        });
        setLoaded(true);
    };

    useEffect(() => {
        loadConfig();

        window.addEventListener(AI_CONFIG_EVENT, loadConfig);
        return () => window.removeEventListener(AI_CONFIG_EVENT, loadConfig);
    }, []);

    return { config, loaded };
}
