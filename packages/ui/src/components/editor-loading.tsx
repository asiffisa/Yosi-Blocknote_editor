"use client";

/**
 * Loading skeleton for the BlockNote editor
 */
export function EditorLoading() {
    return (
        <div className="h-full w-full animate-pulse rounded-lg bg-white p-6 dark:bg-zinc-900">
            {/* Toolbar skeleton */}
            <div className="mb-4 flex gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="h-8 w-8 rounded bg-zinc-200 dark:bg-zinc-800"
                    />
                ))}
            </div>

            {/* Content skeleton */}
            <div className="space-y-3">
                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
        </div>
    );
}

/**
 * Simple loading spinner
 */
export function LoadingSpinner() {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Loading editor...
                </p>
            </div>
        </div>
    );
}

/**
 * Full page loading screen for main layout
 */
export function LoadingScreen() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-zinc-950">
            <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100" />
                <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    Loading Yosi...
                </p>
            </div>
        </div>
    );
}
