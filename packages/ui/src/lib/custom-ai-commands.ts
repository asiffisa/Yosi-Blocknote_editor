import { BlockNoteEditor } from "@blocknote/core";
import { AIMenuSuggestionItem } from "@blocknote/xl-ai";
import {
    Sparkles,
    Check,
    Minimize2,
    Maximize2,
    MessageSquare,
    PenLine,
    Lightbulb,
    RefreshCw,
    Pencil
} from "lucide-react";
import React from "react";

/**
 * Get all custom AI menu items for Yosi Editor
 * Returns items that appear when user clicks AI button or types /ai commands
 */
export function getCustomAIMenuItems(_editor: BlockNoteEditor): AIMenuSuggestionItem[] {
    return [
        {
            key: "improve_writing",
            title: "Improve Writing",
            icon: React.createElement(Sparkles),
            onItemClick: (setPrompt) => {
                setPrompt("Improve the writing of the selected text. Enhance clarity, flow, and impact.");
            },
        },
        {
            key: "fix_grammar",
            title: "Fix Grammar & Spelling",
            icon: React.createElement(Check),
            onItemClick: (setPrompt) => {
                setPrompt("Fix any grammar and spelling errors in the selected text.");
            },
        },
        {
            key: "make_shorter",
            title: "Make Shorter",
            icon: React.createElement(Minimize2),
            onItemClick: (setPrompt) => {
                setPrompt("Make the selected text shorter and more concise while keeping the main meaning.");
            },
        },
        {
            key: "make_longer",
            title: "Make Longer",
            icon: React.createElement(Maximize2),
            onItemClick: (setPrompt) => {
                setPrompt("Expand on the selected text with more details and explanation.");
            },
        },
        {
            key: "tone_professional",
            title: "Change Tone → Professional",
            icon: React.createElement(MessageSquare),
            onItemClick: (setPrompt) => {
                setPrompt("Rewrite the selected text to sound professional and formal.");
            },
        },
        {
            key: "tone_casual",
            title: "Change Tone → Casual",
            icon: React.createElement(MessageSquare),
            onItemClick: (setPrompt) => {
                setPrompt("Rewrite the selected text to sound casual and conversational.");
            },
        },
        {
            key: "continue_writing",
            title: "Continue Writing",
            icon: React.createElement(PenLine),
            onItemClick: (setPrompt) => {
                setPrompt("Continue writing from the selected text. Maintain the style and flow.");
            },
        },
        {
            key: "simplify",
            title: "Simplify",
            icon: React.createElement(Lightbulb),
            onItemClick: (setPrompt) => {
                setPrompt("Simplify the selected text to make it easier to understand.");
            },
        },
        {
            key: "paraphrase",
            title: "Paraphrase",
            icon: React.createElement(RefreshCw),
            onItemClick: (setPrompt) => {
                setPrompt("Paraphrase the selected text using different words but keeping the same meaning.");
            },
        },
        {
            key: "rewrite",
            title: "Rewrite",
            icon: React.createElement(Pencil),
            onItemClick: (setPrompt) => {
                setPrompt("Rewrite the selected text to be more effective.");
            },
        },
    ];
}
