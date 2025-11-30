/**
 * Shared TypeScript types for Yosi UI package
 */

import type { Block, BlockNoteEditor as BNEditor } from "@blocknote/core";

/**
 * Theme type for all components
 */
export type EditorTheme = "light" | "dark";

/**
 * Props for the BlockNote editor component
 */
export interface BlockNoteEditorProps {
    /** Theme for the editor (light or dark) */
    theme?: EditorTheme;
    /** Additional CSS class names */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
    /** Initial content blocks */
    initialContent?: Block[];
    /** Callback when editor content changes */
    onChange?: (blocks: Block[]) => void;
    /** Callback when editor is ready */
    onEditorReady?: (editor: BNEditor) => void;
    /** Whether editor is editable */
    editable?: boolean;
}

/**
 * Re-export BlockNote types for convenience
 */
export type { Block, BlockNoteEditor as BNEditorType } from "@blocknote/core";
