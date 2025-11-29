"use client";

import React from "react";
import { Editor as EditorComponent } from "@yosi/ui";

export function Editor() {
    return (
        <div className="flex h-full flex-col rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex items-center border-b p-2">
                <div className="font-semibold">Editor</div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <EditorComponent />
            </div>
        </div>
    );
}
