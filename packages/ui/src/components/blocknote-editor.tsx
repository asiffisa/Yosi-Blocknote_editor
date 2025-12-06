"use client";

import { useState, useEffect } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";
import { en as defaultEn } from "@blocknote/core/locales";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import {
    AIExtension,
    AIMenuController,
    AIToolbarButton,
    getDefaultAIMenuItems,
    AIMenu,
    getAISlashMenuItems
} from "@blocknote/xl-ai";
import { BlockNoteEditor as BlockNoteEditorType } from "@blocknote/core";
import {
    FormattingToolbar,
    FormattingToolbarController,
    getFormattingToolbarItems,
    SuggestionMenuController,
    getDefaultReactSlashMenuItems
} from "@blocknote/react";

import type { BlockNoteEditorProps } from "../types";
import { EditorErrorFallback } from "./editor-error-boundary";
import { EditorLoading } from "./editor-loading";
import { createYosiTransport } from "../lib/yosi-transport";
import { getCustomAIMenuItems } from "../lib/custom-ai-commands";
import { useAIConfig } from "../lib/use-ai-config";

/**
 * Utility to filter suggestion items based on query
 */
const filterSuggestionItems = (items: any[], query: string) => {
    return items.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.aliases?.some((alias: string) => alias.toLowerCase().includes(query.toLowerCase()))
    );
};

/**
 * Custom dictionary with overridden placeholder
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
 * CustomAIMenu with both default and custom items
 */
function CustomAIMenu() {
    return (
        <AIMenu
            items={(
                editor: BlockNoteEditorType<any, any, any>,
                aiResponseStatus:
                    | "user-input"
                    | "thinking"
                    | "ai-writing"
                    | "error"
                    | "user-reviewing"
                    | "closed"
            ) => {
                const defaultItems = getDefaultAIMenuItems(editor, aiResponseStatus);

                if (aiResponseStatus === "user-input") {
                    // When text is selected (via formatting toolbar)
                    if (editor.getSelection()) {
                        // Use ONLY custom items to match the requested design exactly
                        // This replaces the default inconsistent list with our curated, icon-rich list
                        return getCustomAIMenuItems(editor);
                    }
                }
                return defaultItems;
            }}
        />
    );
}

/**
 * Formatting toolbar with AI button
 */
function FormattingToolbarWithAI() {
    return (
        <FormattingToolbarController
            formattingToolbar={() => (
                <FormattingToolbar>
                    {...getFormattingToolbarItems()}
                    <AIToolbarButton />
                </FormattingToolbar>
            )}
        />
    );
}

/**
 * Inner editor component that gets re-mounted when AI config changes
 */
function BlockNoteEditorInner({
    aiConfig,
    ...props
}: BlockNoteEditorProps & { aiConfig: { apiKey: string; provider: "deepseek" | "openai" | "google"; model: string } }) {
    const { theme, className, style, initialContent, onChange, onEditorReady, editable } = props;
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Create the BlockNote editor instance with AI extension
    // We always add the extension so the UI shows up, even if the key is invalid initially
    const editor = useCreateBlockNote({
        dictionary: customDictionary,
        initialContent,
        extensions: [
            AIExtension({
                transport: createYosiTransport(aiConfig),
            }),
        ],
    });

    // Call onEditorReady callback if provided
    useEffect(() => {
        if (editor && isLoading && onEditorReady) {
            try {
                onEditorReady(editor);
                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err : new Error("Editor initialization failed"));
                setIsLoading(false);
            }
        } else if (isLoading) {
            setIsLoading(false);
        }
    }, [editor, isLoading, onEditorReady]);

    // Show loading state
    if (isLoading && !editor) {
        return <EditorLoading />;
    }

    // Show error state
    if (error || !editor) {
        return <EditorErrorFallback error={error || new Error("Editor not initialized")} />;
    }

    // Render editor with AI features
    return (
        <BlockNoteView
            editor={editor}
            theme={theme}
            className={className}
            style={style}
            editable={editable}
            formattingToolbar={false}
            slashMenu={false}
            onChange={() => {
                if (onChange) {
                    onChange(editor.document);
                }
            }}
        >
            <AIMenuController aiMenu={CustomAIMenu} />
            <FormattingToolbarWithAI />
            <SuggestionMenuWithAI editor={editor} />
        </BlockNoteView>
    );
}

/**
 * Slash menu with the AI option added
 */
function SuggestionMenuWithAI(props: { editor: BlockNoteEditorType<any, any, any> }) {
    return (
        <SuggestionMenuController
            triggerCharacter={"/"}
            getItems={async (query) =>
                filterSuggestionItems(
                    [
                        ...getDefaultReactSlashMenuItems(props.editor),
                        ...getAISlashMenuItems(props.editor),
                    ],
                    query
                )
            }
        />
    );
}

/**
 * Wrapper component that handles AI configuration loading and updates
 */
export function BlockNoteEditor(props: BlockNoteEditorProps) {
    const { config: aiConfig, loaded: configLoaded } = useAIConfig();

    if (!configLoaded) {
        return <EditorLoading />;
    }

    // Key forces re-mount when config changes (especially API key)
    return (
        <BlockNoteEditorInner
            key={`${aiConfig.provider}-${aiConfig.model}-${aiConfig.apiKey}`}
            aiConfig={aiConfig}
            {...props}
        />
    );
}
