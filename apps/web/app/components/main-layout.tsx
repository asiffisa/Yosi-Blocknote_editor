"use client";

import React from "react";
import { Canvas } from "./canvas";

export function MainLayout() {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    return (
        <div className="h-screen w-full">
            <Canvas />
        </div>
    );
}
