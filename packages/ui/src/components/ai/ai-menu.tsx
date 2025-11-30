"use client";

import { BlockNoteEditor } from "@blocknote/core";
import {
    AIMenu,
    AIMenuController as DefaultAIMenuController,
    getDefaultAIMenuItems,
} from "@blocknote/xl-ai";
import { getAllAICommands } from "./ai-commands";

/**
 * Custom AI Menu with all 9 commands
 * Shows custom commands when text is selected
 */
function CustomAIMenu() {
    return (
        <AIMenu
            items={(
                editor: BlockNoteEditor<any, any, any>,
                aiResponseStatus:
                    | "user-input"
                    | "thinking"
                    | "ai-writing"
                    | "error"
                    | "user-reviewing"
                    | "closed"
            ) => {
                // ALWAYS show our custom commands
                // Don't mix with defaults to avoid duplicate keys
                if (aiResponseStatus === "user-input") {
                    return getAllAICommands(editor);
                }
                // For other states (thinking, writing, etc.), return default items
                return getDefaultAIMenuItems(editor, aiResponseStatus);
            }}
        />
    );
}

/**
 * AI Menu Controller with our custom menu
 */
export function AIMenuController() {
    return <DefaultAIMenuController aiMenu={CustomAIMenu} />;
}
