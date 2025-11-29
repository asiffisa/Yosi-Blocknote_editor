"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import "@blocknote/core/fonts/inter.css";

export function BlockNoteEditor() {
    // Create the BlockNote editor instance
    const editor = useCreateBlockNote({
        initialContent: [
            {
                type: "paragraph",
                content: "Welcome to Yosi! Type '/' for commands...",
            },
        ],
    });

    return (
        <BlockNoteView
            editor={editor}
            theme="light"
        />
    );
}
