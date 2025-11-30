"use client";

import { useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import { en as defaultEn } from "@blocknote/core/locales";

import type { BlockNoteEditorProps } from "../types";
import { EditorErrorFallback } from "./editor-error-boundary";
import { EditorLoading } from "./editor-loading";

/**
 * Custom dictionary with overridden placeholder
 */
const customDictionary = {
    ...defaultEn,
    placeholders: {
        ...defaultEn.placeholders,
        default: "Write, / for commands",
    },
};

/**
 * BlockNote editor component with error handling and loading states
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

    // Create the BlockNote editor instance with error handling
    let editor;
    try {
        editor = useCreateBlockNote({
            dictionary: customDictionary,
            initialContent,
        });

        // Call onEditorReady callback if provided
        if (onEditorReady && editor && isLoading) {
            try {
                onEditorReady(editor);
                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err : new Error("Editor initialization failed"));
                setIsLoading(false);
            }
        } else if (isLoading) {
            // Mark as loaded even without callback
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
        return <EditorErrorFallback error={error || new Error("Editor not initialized")} />;
    }

    // Render editor
    return (
        <BlockNoteView
            editor={editor}
            theme={theme}
            className={className}
            style={style}
            editable={editable}
            onChange={() => {
                if (onChange) {
                    onChange(editor.document);
                }
            }}
        />
    );
}
