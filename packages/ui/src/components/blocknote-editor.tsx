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
                type: "heading",
                content: "Block note editor",
            },
            {
                type: "paragraph",
                content: "Hello world",
            },
        ],
    });

    return (
        <BlockNoteView
            editor={editor}
            theme="light"
            style={{ minHeight: '350px' }}
        />
    );
}
