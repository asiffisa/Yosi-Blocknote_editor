"use client";

import React from "react";
import { Canvas } from "./canvas";
import { EditorErrorBoundary, LoadingScreen } from "@yosi/ui";

export function MainLayout() {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <LoadingScreen />;
    }

    return (
        <EditorErrorBoundary>
            <div className="h-screen w-full">
                <Canvas />
            </div>
        </EditorErrorBoundary>
    );
}

