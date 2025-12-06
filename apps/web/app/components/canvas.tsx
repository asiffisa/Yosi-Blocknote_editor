"use client";

import { BlockNoteEditor } from "@yosi/ui";
import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { ApiKeyDialog } from "@/app/components/api-key-dialog";

export function Canvas() {
    const [theme, setTheme] = useState<"light" | "dark">("dark");

    // Apply dark class to document root for portaled components (dialogs, etc.)
    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);

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
            {/* Top Right Controls */}
            <div className="fixed top-8 right-8 z-10000 flex gap-4">
                {/* AI Settings Dialog */}
                <ApiKeyDialog />

                {/* Theme Toggle Button */}
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
        </div>
    );
}

