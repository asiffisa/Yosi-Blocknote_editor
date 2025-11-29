"use client";

import { BlockNoteEditor } from "@yosi/ui";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function Canvas() {
    const [theme, setTheme] = useState<"light" | "dark">("dark");

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    return (
        <div
            className={theme === "dark" ? "dark" : ""}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                backgroundImage: theme === "dark"
                    ? 'url("/Yosi_BG_dark.webp")'
                    : 'url("/Yosi_BG_light.webp")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transition: 'background-image 0.3s ease'
            }}
        >
            {/* Theme Toggle Button */}
            <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 10000 }}>
                <Button
                    onClick={toggleTheme}
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                >
                    {theme === "dark" ? (
                        <Sun className="h-4 w-4 text-white" />
                    ) : (
                        <Moon className="h-4 w-4 text-black" />
                    )}
                </Button>
            </div>


            {/* Centered Editor Container */}
            <div style={{
                width: '100%',
                maxWidth: '800px',
                padding: '2rem',
                margin: '0 auto',
                boxSizing: 'border-box'
            }}>
                <div style={{
                    width: '100%',
                }}>
                    <BlockNoteEditor
                        theme={theme}
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
