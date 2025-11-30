"use client";

import React from "react";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component to catch React errors in editor tree
 */
export class EditorErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error for debugging
        console.error("Editor Error Boundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex h-full items-center justify-center p-8">
                    <div className="max-w-md rounded-lg border border-red-500/20 bg-red-50 p-6 text-center dark:bg-red-950/20">
                        <div className="mb-4 text-4xl">⚠️</div>
                        <h3 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
                            Editor Error
                        </h3>
                        <p className="mb-4 text-sm text-red-700 dark:text-red-300">
                            Something went wrong while loading the editor.
                        </p>
                        {this.state.error && (
                            <details className="mb-4 text-left">
                                <summary className="cursor-pointer text-xs text-red-600 dark:text-red-400">
                                    Error details
                                </summary>
                                <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs dark:bg-red-900/30">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={this.handleReset}
                            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Simple error fallback component for functional components
 */
export function EditorErrorFallback({ error }: { error?: Error }) {
    return (
        <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-md rounded-lg border border-red-500/20 bg-red-50 p-6 text-center dark:bg-red-950/20">
                <div className="mb-4 text-4xl">⚠️</div>
                <h3 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">
                    Editor Failed to Load
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                    {error?.message || "An unexpected error occurred"}
                </p>
            </div>
        </div>
    );
}
