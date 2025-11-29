"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";


export interface BlockNoteEditorProps {
    theme?: "light" | "dark";
    className?: string;
    style?: React.CSSProperties;
}

// @ts-ignore
import { en } from "./blocknote-dictionary";

export function BlockNoteEditor({ theme = "dark", className, style }: BlockNoteEditorProps) {
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
            className={className}
            style={style}
        />
    );
}
