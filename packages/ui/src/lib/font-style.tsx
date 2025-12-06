"use client";

import { createReactStyleSpec } from "@blocknote/react";

/**
 * Available fonts for the editor
 */
export const AVAILABLE_FONTS = [
    { name: "Default", value: "inherit" },
    { name: "Sans Serif", value: "Inter, system-ui, sans-serif" },
    { name: "Serif", value: "Georgia, serif" },
    { name: "Monospace", value: "JetBrains Mono, Consolas, monospace" },
    { name: "Handwriting", value: "Caveat, cursive" },
] as const;

export type FontValue = typeof AVAILABLE_FONTS[number]["value"];

/**
 * Custom font style spec for BlockNote
 * Allows setting font-family on text selections
 */
export const FontStyle = createReactStyleSpec(
    {
        type: "font",
        propSchema: "string",
    },
    {
        render: (props) => (
            <span style={{ fontFamily: props.value }} ref={props.contentRef} />
        ),
    }
);
