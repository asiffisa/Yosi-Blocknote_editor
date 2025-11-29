"use client";

import { BlockNoteEditor } from "@yosi/ui";

export function Canvas() {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                backgroundImage: 'url("/yosi background.webp")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl overflow-hidden"
                style={{
                    width: '900px',
                    minHeight: '400px',
                    maxWidth: '90vw',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', minHeight: '400px' }}>
                    <BlockNoteEditor />
                </div>
            </div>
        </div>
    );
}
