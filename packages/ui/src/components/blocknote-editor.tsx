"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";


export interface BlockNoteEditorProps {
    theme?: "light" | "dark";
}

// @ts-ignore
import { en } from "./blocknote-dictionary";

export function BlockNoteEditor({ theme = "dark" }: BlockNoteEditorProps) {
    // Create the BlockNote editor instance
    const editor = useCreateBlockNote({
        dictionary: {
            ...en,
            placeholders: {
                ...en.placeholders,
                default: "Write, / for commands",
            },
        } as any,
        initialContent: undefined,
    });

    return (
        <BlockNoteView
            editor={editor}
            theme={theme}
            style={{ minHeight: '360px' }}
        />
    );
}
