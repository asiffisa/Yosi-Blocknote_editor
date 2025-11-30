"use client";

import { useState, useEffect } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/xl-ai/style.css";
import { en as defaultEn } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import { createAIExtension } from "@blocknote/xl-ai";
import { BackendTransport } from "../lib/backend-transport";

import type { BlockNoteEditorProps } from "../types";
import { EditorErrorFallback } from "./editor-error-boundary";
import { EditorLoading } from "./editor-loading";
import { getAISettings } from "../lib/ai-key-manager";
import { FormattingToolbarWithAI, SuggestionMenuWithAI } from "./ai/ai-components";
import { AIMenuController } from "./ai/ai-menu";

/**
 * Custom dictionary with AI translations
 */
const customDictionary = {
    ...defaultEn,
    ai: aiEn,
    placeholders: {
        ...defaultEn.placeholders,
        default: "Write, / for commands",
    },
};

/**
 * BlockNote editor component with AI integration and all 9 commands
 */
export function BlockNoteEditor({
    theme = "dark",
    className,
    style,
    initialContent,
    onChange,
    onEditorReady,
    editable = true,
}: BlockNoteEditorProps) {
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Create AI extension - always create it, but handle missing API key gracefully
    const aiExtension = createAIExtension({
        transport: new BackendTransport({
            api: "/api/ai/chat",
            headers: async () => {
                return {
                    "Content-Type": "application/json",
                };
            },
            // Custom body to include user's API key and provider
            getExtraBody: async () => {
                const settings = getAISettings();

                // Check if API key is configured
                if (!settings?.apiKey) {
                    throw new Error(
                        "API key not configured. Please click the settings button (⚙️) to add your API key."
                    );
                }

                return {
                    userApiKey: settings.apiKey,
                    provider: settings.provider,
                    model: settings.model,
                };
            },
        }),
    });

    // Create the BlockNote editor instance
    let editor;
    try {
        editor = useCreateBlockNote({
            dictionary: customDictionary,
            initialContent,
            extensions: [aiExtension], // Always include AI extension
        });

        // Call onEditorReady callback if provided
        if (onEditorReady && editor && isLoading) {
            try {
                onEditorReady(editor);
                setIsLoading(false);
            } catch (err) {
                setError(
                    err instanceof Error ? err : new Error("Editor initialization failed")
                );
                setIsLoading(false);
            }
        } else if (isLoading) {
            setIsLoading(false);
        }
    } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to create editor"));
        setIsLoading(false);
    }

    // Show loading state
    if (isLoading && !editor) {
        return <EditorLoading />;
    }

    // Show error state
    if (error || !editor) {
        return (
            <EditorErrorFallback
                error={error || new Error("Editor not initialized")}
            />
        );
    }

    // Render editor with custom AI UI components
    return (
        <BlockNoteView
            editor={editor}
            theme={theme}
            className={className}
            style={style}
            editable={editable}
            // Disable default UI elements, we'll use custom ones
            formattingToolbar={false}
            slashMenu={false}
            onChange={() => {
                if (onChange) {
                    onChange(editor.document);
                }
            }}
        >
            {/* AI Menu Controller with all 9 commands */}
            <AIMenuController />

            {/* Custom Formatting Toolbar with AI button */}
            <FormattingToolbarWithAI />

            {/* Custom Slash Menu with /ai option */}
            <SuggestionMenuWithAI editor={editor} />
        </BlockNoteView>
    );
}
