"use client";

import { useState, useEffect } from "react";
import { X, Key, Check, AlertCircle } from "lucide-react";
import {
    type AIProvider,
    saveApiKey,
    getApiKey,
    deleteApiKey,
    saveCurrentProvider,
    getCurrentProvider,
    validateApiKeyFormat,
    getProviderName,
    getDefaultModel,
    saveModel,
    getModel,
} from "../../lib/ai-key-manager";

interface ApiKeySettingsProps {
    onClose: () => void;
}

const PROVIDERS: AIProvider[] = ["deepseek", "openai", "google", "grok", "anthropic"];

const PROVIDER_MODELS: Record<AIProvider, string[]> = {
    openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    deepseek: ["deepseek-chat", "deepseek-coder"],
    google: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"],
    grok: ["grok-2-latest", "grok-2-vision"],
    anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
};

export function ApiKeySettings({ onClose }: ApiKeySettingsProps) {
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>(getCurrentProvider());
    const [apiKey, setApiKey] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [showKey, setShowKey] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Load existing key and model when provider changes
    useEffect(() => {
        const existingKey = getApiKey(selectedProvider);
        setApiKey(existingKey || "");

        const existingModel = getModel(selectedProvider) || getDefaultModel(selectedProvider);
        setSelectedModel(existingModel);

        setError("");
        setSuccess(false);
    }, [selectedProvider]);

    const handleSave = () => {
        setError("");
        setSuccess(false);

        // Validate API key format
        if (!validateApiKeyFormat(selectedProvider, apiKey)) {
            setError(`Invalid API key format for ${getProviderName(selectedProvider)}`);
            return;
        }

        try {
            // Save API key and model
            saveApiKey(selectedProvider, apiKey);
            saveModel(selectedProvider, selectedModel);
            saveCurrentProvider(selectedProvider);

            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setError("Failed to save API key. Please try again.");
        }
    };

    const handleDelete = () => {
        deleteApiKey(selectedProvider);
        setApiKey("");
        setSuccess(false);
        setError("");
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            AI Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                    </button>
                </div>

                {/* Provider Selection */}
                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Provider
                    </label>
                    <select
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value as AIProvider)}
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                        {PROVIDERS.map((provider) => (
                            <option key={provider} value={provider}>
                                {getProviderName(provider)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Model Selection */}
                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Model
                    </label>
                    <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                        {PROVIDER_MODELS[selectedProvider].map((model) => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                    </select>
                </div>

                {/* API Key Input */}
                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        API Key
                    </label>
                    <div className="relative">
                        <input
                            type={showKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={`Enter your ${getProviderName(selectedProvider)} API key`}
                            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-20 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        >
                            {showKey ? "Hide" : "Show"}
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Your API key is encrypted and stored locally
                    </p>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/20 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        Settings saved successfully!
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={!apiKey}
                        className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        Save
                    </button>
                    {apiKey && (
                        <button
                            onClick={handleDelete}
                            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Delete
                        </button>
                    )}
                </div>

                {/* Help Text */}
                <div className="mt-4 rounded-md bg-zinc-50 p-3 dark:bg-zinc-800/50">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        <strong>Need an API key?</strong> Visit{" "}
                        {selectedProvider === "openai" && (
                            <a
                                href="https://platform.openai.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                                platform.openai.com
                            </a>
                        )}
                        {selectedProvider === "deepseek" && (
                            <a
                                href="https://platform.deepseek.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                                platform.deepseek.com
                            </a>
                        )}
                        {selectedProvider === "google" && (
                            <a
                                href="https://aistudio.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                                aistudio.google.com
                            </a>
                        )}
                        {selectedProvider === "grok" && (
                            <a
                                href="https://console.x.ai"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                                console.x.ai
                            </a>
                        )}
                        {selectedProvider === "anthropic" && (
                            <a
                                href="https://console.anthropic.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                                console.anthropic.com
                            </a>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
