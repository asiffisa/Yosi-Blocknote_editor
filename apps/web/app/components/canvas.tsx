"use client";

import { BlockNoteEditor, ApiKeySettings } from "@yosi/ui";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Sun, Moon, Settings } from "lucide-react";

export function Canvas() {
    const [theme, setTheme] = useState<"light" | "dark">("dark");
    const [showSettings, setShowSettings] = useState(false);

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center bg-cover bg-center bg-no-repeat transition-all duration-300 ${theme === "dark" ? "dark" : ""}`}
            style={{
                backgroundImage: theme === "dark"
                    ? 'url("/Yosi_BG_dark.webp")'
                    : 'url("/Yosi_BG_light.webp")',
            }}
        >
            {/* Theme Toggle Button */}
            <div className="fixed right-8 top-8 z-50 flex gap-2">
                <Button
                    onClick={() => setShowSettings(true)}
                    variant="outline"
                    size="icon"
                    className="rounded-full transition-all hover:scale-110"
                >
                    <Settings className="h-4 w-4 text-black dark:text-white" />
                </Button>
                <Button
                    onClick={toggleTheme}
                    variant="outline"
                    size="icon"
                    className="rounded-full transition-all hover:scale-110"
                >
                    {theme === "dark" ? (
                        <Sun className="h-4 w-4 text-white" />
                    ) : (
                        <Moon className="h-4 w-4 text-black" />
                    )}
                </Button>
            </div>

            {/* Centered Editor Container */}
            <div className="mx-auto w-full max-w-3xl p-8">
                <div className="w-full">
                    <BlockNoteEditor
                        theme={theme}
                        className="transition-opacity duration-200"
                        style={{
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            minHeight: '200px'
                        }}
                    />
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <ApiKeySettings onClose={() => setShowSettings(false)} />
            )}
        </div>
    );
}

