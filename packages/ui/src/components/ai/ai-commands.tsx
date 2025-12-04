"use client";

import { BlockNoteEditor } from "@blocknote/core";
import {
    type AIMenuSuggestionItem,
    AIExtension,
    aiDocumentFormats,
} from "@blocknote/xl-ai";
import {
    Sparkles,
    CheckCircle,
    Minimize2,
    Maximize2,
    MessageSquare,
    PenLine,
    Lightbulb,
    RefreshCw,
    Edit3,
} from "lucide-react";

/**
 * All 9 AI Commands as specified in Phase 1.1 plan
 */

// 1. Improve Writing
export const improveWriting = (
    editor: BlockNoteEditor
): AIMenuSuggestionItem => ({
    key: "improve_writing",
    title: "Improve Writing",
    aliases: ["improve", "enhance", "better"],
    icon: <Sparkles size={18} />,
    onItemClick: async () => {
        await editor.getExtension(AIExtension)?.invokeAI({
            userPrompt: "Improve the clarity, flow, and overall quality of this text",
            useSelection: true,
            streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
                defaultStreamTools: { add: false, delete: false, update: true },
            }),
        });
    },
    size: "small",
});

// 2. Fix Grammar & Spelling
export const fixGrammar = (editor: BlockNoteEditor): AIMenuSuggestionItem => ({
    key: "fix_grammar",
    title: "Fix Grammar & Spelling",
    aliases: ["grammar", "spelling", "correct", "fix"],
    icon: <CheckCircle size={18} />,
    onItemClick: async () => {
        await editor.getExtension(AIExtension)?.invokeAI({
            userPrompt:
                "Fix all grammar and spelling errors in this text. Keep the meaning and tone the same.",
            useSelection: true,
            streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
                defaultStreamTools: { add: false, delete: false, update: true },
            }),
        });
    },
    size: "small",
});

// 3. Make Shorter
export const makeShorter = (editor: BlockNoteEditor): AIMenuSuggestionItem => ({
    key: "make_shorter",
    title: "Make Shorter",
    aliases: ["shorter", "condense", "brief", "summarize"],
    icon: <Minimize2 size={18} />,
    onItemClick: async () => {
        await editor.getExtension(AIExtension)?.invokeAI({
            userPrompt:
                "Condense this text to be more concise while keeping the key points",
            useSelection: true,
            streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
                defaultStreamTools: { add: false, delete: false, update: true },
            }),
        });
    },
    size: "small",
});

// 4. Make Longer
export const makeLonger = (editor: BlockNoteEditor): AIMenuSuggestionItem => ({
    key: "make_longer",
    title: "Make Longer",
    aliases: ["longer", "expand", "elaborate", "detailed"],
    icon: <Maximize2 size={18} />,
    onItemClick: async () => {
        await editor.getExtension(AIExtension)?.invokeAI({
            userPrompt: "Expand this text with more details and examples",
            useSelection: true,
            streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
                defaultStreamTools: { add: false, delete: false, update: true },
            }),
        });
    },
    size: "small",
});

// 5. Change Tone - Professional
export const changeToneProfessional = (
    editor: BlockNoteEditor
): AIMenuSuggestionItem => ({
    key: "tone_professional",
    title: "Change Tone → Professional",
    aliases: ["professional", "formal", "business"],
    icon: <MessageSquare size={18} />,
    onItemClick: async () => {
        await editor.getExtension(AIExtension)?.invokeAI({
            userPrompt:
                "Rewrite this text with a professional and formal tone, suitable for business communication",
            useSelection: true,
            streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
                defaultStreamTools: { add: false, delete: false, update: true },
            }),
        });
    },
    size: "small",
});

// 6. Change Tone - Casual
export const changeToneCasual = (
    editor: BlockNoteEditor
): AIMenuSuggestionItem => ({
    key: "tone_casual",
    title: "Change Tone → Casual",
    aliases: ["casual", "informal", "friendly"],
    icon: <MessageSquare size={18} />,
    onItemClick: async () => {
        await editor.getExtension(AIExtension)?.invokeAI({
            userPrompt:
                "Rewrite this text with a casual and friendly tone, as if talking to a friend",
            useSelection: true,
            streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
                defaultStreamTools: { add: false, delete: false, update: true },
            }),
        });
    },
    size: "small",
});

// 7. Continue Writing
export const continueWriting = (
    editor: BlockNoteEditor
): AIMenuSuggestionItem => ({
    key: "continue_writing",
    title: "Continue Writing",
    aliases: ["continue", "complete", "finish"],
    icon: <PenLine size={18} />,
    onItemClick: async () => {
        await editor.getExtension(AIExtension)?.invokeAI({
            userPrompt:
                "Continue writing from where this text ends. Maintain the same style and tone.",
            useSelection: false, // Use full document context
            streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
                defaultStreamTools: { add: true, delete: false, update: false },
            }),
        });
    },
    size: "small",
});

// 8. Simplify
export const simplify = (editor: BlockNoteEditor): AIMenuSuggestionItem => ({
    key: "simplify",
    title: "Simplify",
    aliases: ["simplify", "simple", "easy", "clear"],
    icon: <Lightbulb size={18} />,
    onItemClick: async () => {
        await editor.getExtension(AIExtension)?.invokeAI({
            userPrompt:
                "Rewrite this text to be simpler and easier to understand. Use plain language.",
            useSelection: true,
            streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
                defaultStreamTools: { add: false, delete: false, update: true },
            }),
        });
    },
    size: "small",
});

// 9. Paraphrase
export const paraphrase = (editor: BlockNoteEditor): AIMenuSuggestionItem => ({
    key: "paraphrase",
    title: "Paraphrase",
    aliases: ["paraphrase", "rephrase", "reword"],
    icon: <RefreshCw size={18} />,
    onItemClick: async () => {
        await editor.getExtension(AIExtension)?.invokeAI({
            userPrompt:
                "Paraphrase this text - reword it while keeping the exact same meaning",
            useSelection: true,
            streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
                defaultStreamTools: { add: false, delete: false, update: true },
            }),
        });
    },
    size: "small",
});

// 10. Rewrite
export const rewrite = (editor: BlockNoteEditor): AIMenuSuggestionItem => ({
    key: "rewrite",
    title: "Rewrite",
    aliases: ["rewrite", "redo", "fresh"],
    icon: <Edit3 size={18} />,
    onItemClick: async () => {
        await editor.getExtension(AIExtension)?.invokeAI({
            userPrompt:
                "Completely rewrite this text with a fresh perspective while keeping the core message",
            useSelection: true,
            streamToolsProvider: aiDocumentFormats.html.getStreamToolsProvider({
                defaultStreamTools: { add: false, delete: false, update: true },
            }),
        });
    },
    size: "small",
});

/**
 * Get all custom AI commands
 */
export const getAllAICommands = (editor: BlockNoteEditor): AIMenuSuggestionItem[] => [
    improveWriting(editor),
    fixGrammar(editor),
    makeShorter(editor),
    makeLonger(editor),
    changeToneProfessional(editor),
    changeToneCasual(editor),
    continueWriting(editor),
    simplify(editor),
    paraphrase(editor),
    rewrite(editor),
];
