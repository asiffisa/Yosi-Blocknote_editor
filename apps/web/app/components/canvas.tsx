"use client";

import { BlockNoteEditor } from "@yosi/ui";

export function Canvas() {
    return (
        <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
            {/* Centered BlockNote Editor - 800x600 */}
            <div
                className="bg-white rounded-lg shadow-lg overflow-hidden"
                style={{
                    width: '800px',
                    height: '600px'
                }}
            >
                <BlockNoteEditor />
            </div>
        </div>
    );
}
