import { BlockNoteEditor } from "@blocknote/core";
import { AIMenuSuggestionItem } from "@blocknote/xl-ai";

/**
 * Get all custom AI menu items for Yosi Editor
 * Returns items that appear when user clicks AI button or types /ai commands
 */
export function getCustomAIMenuItems(_editor: BlockNoteEditor): AIMenuSuggestionItem[] {
    return [
        {
            key: "yosi_fix_grammar",
            title: "Fix Grammar & Spelling",
            aliases: ["grammar", "fix grammar", "spelling", "correct"],
            onItemClick: (setPrompt) => {
                setPrompt("Fix grammar and spelling. Maintain the original tone and style.");
            },
        },
        {
            key: "yosi_make_professional",
            title: "Make Professional",
            aliases: ["professional", "formal", "business"],
            onItemClick: (setPrompt) => {
                setPrompt("Rewrite the selected text to be formal, professional, and concise. Suitable for business communication.");
            },
        },
        {
            key: "yosi_simplify",
            title: "Simplify (5th Grade)",
            aliases: ["simplify", "simple", "easy", "5th grade"],
            onItemClick: (setPrompt) => {
                setPrompt("Rewrite the selected text for a 5th-grade reading level. Make it simple and easy to understand.");
            },
        },
        {
            key: "yosi_translate_tamil",
            title: "Translate to Tamil",
            aliases: ["tamil", "translate", "translation"],
            onItemClick: (setPrompt) => {
                setPrompt("Translate the selected text to Tamil. Preserve the meaning and tone.");
            },
        },
    ];
}
