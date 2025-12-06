import { NextResponse } from "next/server";

/**
 * API Error types for better error handling
 */
export interface APIError {
    message: string;
    status: number;
    code?: string;
}

/**
 * Validates that a required header is present
 */
export function validateRequiredHeader(
    value: string | null,
    headerName: string
): APIError | null {
    if (!value) {
        return {
            message: `${headerName} is required`,
            status: headerName.toLowerCase().includes("key") ? 401 : 400,
        };
    }
    return null;
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(error: APIError): NextResponse {
    return NextResponse.json(
        { error: error.message },
        { status: error.status }
    );
}

/**
 * Handles unknown errors and returns appropriate API response
 */
export function handleAPIError(error: unknown): NextResponse {
    // Handle authentication errors
    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes("authentication") || message.includes("api key") || message.includes("unauthorized")) {
            return createErrorResponse({
                message: "Invalid API key. Please check your settings.",
                status: 401,
            });
        }

        if (message.includes("rate limit") || message.includes("429")) {
            return createErrorResponse({
                message: "Rate limit exceeded. Please try again later.",
                status: 429,
            });
        }

        return createErrorResponse({
            message: error.message,
            status: 500,
        });
    }

    return createErrorResponse({
        message: "An error occurred while processing your request",
        status: 500,
    });
}

/**
 * Sanitizes messages to ensure content is never null
 */
export function sanitizeMessages<T extends { content: string | null }>(
    messages: T[]
): T[] {
    return messages.map(msg => ({
        ...msg,
        content: msg.content || "",
    }));
}
