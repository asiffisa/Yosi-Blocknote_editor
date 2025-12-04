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
import { Settings } from "lucide-react";

type Provider = "deepseek" | "openai";

interface ModelOptions {
    [key: string]: { value: string; label: string }[];
}

const MODEL_OPTIONS: ModelOptions = {
    deepseek: [
        { value: "deepseek-chat", label: "DeepSeek Chat" },
        { value: "deepseek-coder", label: "DeepSeek Coder" },
    ],
    openai: [
        { value: "gpt-4", label: "GPT-4" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
};

export function ApiKeyDialog() {
    const [open, setOpen] = useState(false);
    const [provider, setProvider] = useState<Provider>("deepseek");
    const [model, setModel] = useState("deepseek-chat");
    const [apiKey, setApiKey] = useState("");

    // Load settings from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedProvider = localStorage.getItem("yosi_ai_provider") as Provider;
            const savedModel = localStorage.getItem("yosi_ai_model");
            const savedApiKey = localStorage.getItem("yosi_ai_api_key");

            if (savedProvider) setProvider(savedProvider);
            if (savedModel) setModel(savedModel);
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
            localStorage.setItem("yosi_ai_provider", provider);
            localStorage.setItem("yosi_ai_model", model);
            localStorage.setItem("yosi_ai_api_key", apiKey);

            // Notify other components that settings have changed
            window.dispatchEvent(new Event("yosi_ai_config_updated"));
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
                    <Settings className="h-4 w-4 dark:text-white" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>AI Settings</DialogTitle>
                    <DialogDescription>
                        Configure your AI provider and API key. Your key is stored locally in your browser.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
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
                <div className="flex justify-end gap-3">
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
