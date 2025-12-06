"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { KeyRound } from "lucide-react";
import {
    LOCAL_STORAGE_KEYS,
    AI_CONFIG_EVENT,
    MODEL_OPTIONS,
    type Provider,
} from "@yosi/ui";

export function ApiKeyDialog() {
    const [open, setOpen] = useState(false);
    const [provider, setProvider] = useState<Provider>("deepseek");
    const [model, setModel] = useState("deepseek-chat");
    const [apiKey, setApiKey] = useState("");

    // Load settings from localStorage on mount, ensuring consistency
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedProvider = localStorage.getItem(LOCAL_STORAGE_KEYS.PROVIDER) as Provider | null;
            const savedModel = localStorage.getItem(LOCAL_STORAGE_KEYS.MODEL);
            const savedApiKey = localStorage.getItem(LOCAL_STORAGE_KEYS.API_KEY);

            const initialProvider = savedProvider && MODEL_OPTIONS[savedProvider] ? savedProvider : "deepseek";
            setProvider(initialProvider);

            const providerModels = MODEL_OPTIONS[initialProvider].map(m => m.value);
            const initialModel = savedModel && providerModels.includes(savedModel) ? savedModel : providerModels[0];
            setModel(initialModel);

            if (savedApiKey) setApiKey(savedApiKey);
        }
    }, []);

    // Update model when provider changes
    const handleProviderChange = (newProvider: Provider) => {
        setProvider(newProvider);
        // Set default model for the new provider
        const defaultModel = MODEL_OPTIONS[newProvider][0].value;
        setModel(defaultModel);
    };

    const handleSave = () => {
        if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_KEYS.PROVIDER, provider);
            localStorage.setItem(LOCAL_STORAGE_KEYS.MODEL, model);
            localStorage.setItem(LOCAL_STORAGE_KEYS.API_KEY, apiKey);

            // Notify other components that settings have changed
            window.dispatchEvent(new Event(AI_CONFIG_EVENT));
        }
        setOpen(false);
    };

    const isValid = apiKey.trim().length > 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full transition-all hover:scale-110"
                >
                    <KeyRound className="h-4 w-4 dark:text-white" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>AI Settings</DialogTitle>
                    <DialogDescription>
                        Configure your AI provider and API key.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-8 py-4">
                    {/* Provider Selection */}
                    <div className="grid gap-2">
                        <Label htmlFor="provider">Model Provider</Label>
                        <Select value={provider} onValueChange={(value) => handleProviderChange(value as Provider)}>
                            <SelectTrigger id="provider">
                                <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="deepseek">DeepSeek</SelectItem>
                                <SelectItem value="openai">OpenAI</SelectItem>
                                <SelectItem value="google">Google</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Model Selection */}
                    <div className="grid gap-2">
                        <Label htmlFor="model">Select Model</Label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger id="model">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                                {MODEL_OPTIONS[provider].map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* API Key Input */}
                    <div className="grid gap-2">
                        <Label htmlFor="apiKey">API Key</Label>
                        <Input
                            id="apiKey"
                            type="password"
                            placeholder="Enter your API key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-6">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!isValid}>
                        Save Settings
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
