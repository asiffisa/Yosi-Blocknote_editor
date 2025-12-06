"use client";

import { useBlockNoteEditor, useComponentsContext } from "@blocknote/react";
import { useState, useCallback, useRef, useEffect } from "react";
import { Type, ChevronDown, Check } from "lucide-react";
import { AVAILABLE_FONTS, FontValue } from "./font-style";

/**
 * Font selector button component for the formatting toolbar
 * Shows a dropdown with available fonts
 */
export function FontToolbarButton() {
    const editor = useBlockNoteEditor();
    const Components = useComponentsContext();
    const [isOpen, setIsOpen] = useState(false);
    const [currentFont, setCurrentFont] = useState<string>("inherit");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get current font from selection
    useEffect(() => {
        const updateCurrentFont = () => {
            const styles = editor.getActiveStyles() as Record<string, unknown>;
            const font = styles.font as string | undefined;
            setCurrentFont(font || "inherit");
        };

        updateCurrentFont();
        // Listen to selection changes
        editor.onSelectionChange(updateCurrentFont);
    }, [editor]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleFontChange = useCallback(
        (fontValue: FontValue) => {
            if (fontValue === "inherit") {
                (editor as any).removeStyles({ font: fontValue });
            } else {
                (editor as any).addStyles({ font: fontValue });
            }
            setCurrentFont(fontValue);
            setIsOpen(false);
        },
        [editor]
    );

    const getCurrentFontName = () => {
        return AVAILABLE_FONTS.find((f) => f.value === currentFont)?.name || "Default";
    };

    if (!Components) {
        return null;
    }

    return (
        <div ref={dropdownRef} style={{ position: "relative" }}>
            <Components.FormattingToolbar.Button
                mainTooltip="Font"
                onClick={() => setIsOpen(!isOpen)}
                isSelected={isOpen}
            >
                <Type size={16} />
                <span style={{ fontSize: "11px", marginLeft: "2px", maxWidth: "60px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {getCurrentFontName()}
                </span>
                <ChevronDown size={12} style={{ marginLeft: "2px" }} />
            </Components.FormattingToolbar.Button>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: "0",
                        marginTop: "4px",
                        backgroundColor: "var(--bn-colors-menu-background, #fff)",
                        border: "1px solid var(--bn-colors-border, #e0e0e0)",
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        zIndex: 1000,
                        minWidth: "160px",
                        overflow: "hidden",
                    }}
                >
                    {AVAILABLE_FONTS.map((font) => (
                        <button
                            key={font.value}
                            onClick={() => handleFontChange(font.value)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                padding: "8px 12px",
                                border: "none",
                                background: currentFont === font.value ? "var(--bn-colors-highlighted-background, #f0f0f0)" : "transparent",
                                cursor: "pointer",
                                fontFamily: font.value,
                                fontSize: "14px",
                                color: "var(--bn-colors-text, #333)",
                                textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                                if (currentFont !== font.value) {
                                    (e.target as HTMLButtonElement).style.background = "var(--bn-colors-hovered-background, #f5f5f5)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentFont !== font.value) {
                                    (e.target as HTMLButtonElement).style.background = "transparent";
                                }
                            }}
                        >
                            <span>{font.name}</span>
                            {currentFont === font.value && <Check size={14} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
