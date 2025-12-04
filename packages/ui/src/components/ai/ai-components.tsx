"use client";

import { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import {
    FormattingToolbar,
    FormattingToolbarController,
    getDefaultReactSlashMenuItems,
    getFormattingToolbarItems,
    SuggestionMenuController,
} from "@blocknote/react";
import {
    AIToolbarButton,
    getAISlashMenuItems,
} from "@blocknote/xl-ai";

/**
 * Custom Formatting Toolbar with AI Button
 * Adds the AI sparkle button to the formatting toolbar
 */
export function FormattingToolbarWithAI() {
    return (
        <FormattingToolbarController
            formattingToolbar={() => (
                <FormattingToolbar>
                    {/* Add all default formatting buttons */}
                    {...getFormattingToolbarItems()}
                    {/* Add the AI button (sparkle icon) */}
                    <AIToolbarButton />
                </FormattingToolbar>
            )}
        />
    );
}

/**
 * Custom Slash Menu with AI Options
 * Adds /ai command to the slash menu
 */
export function SuggestionMenuWithAI({
    editor,
}: {
    editor: BlockNoteEditor<any, any, any>;
}) {
    return (
        <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
                filterSuggestionItems(
                    [
                        ...getDefaultReactSlashMenuItems(editor),
                        // Add the default AI slash menu items
                        ...getAISlashMenuItems(editor),
                    ],
                    query
                )
            }
        />
    );
}
