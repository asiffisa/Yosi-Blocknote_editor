import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Allowlist of upstream hosts this proxy is permitted to forward to.
 *
 * SECURITY: Without this check the route is an open proxy — an attacker could
 * pass any `url` and use the server to reach internal services or cloud
 * metadata endpoints (SSRF). Only the known LLM provider APIs are allowed, and
 * only over HTTPS. Keep this in sync with the providers in `SUPPORTED_PROVIDERS`
 * (packages/ui/src/lib/constants.ts) and the base URLs in yosi-transport.ts.
 */
const ALLOWED_HOSTS = new Set<string>([
    "api.openai.com",
    "api.deepseek.com",
    "generativelanguage.googleapis.com",
]);

function isAllowedTarget(rawUrl: string): URL | null {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        return null;
    }
    if (parsed.protocol !== "https:") return null;
    if (!ALLOWED_HOSTS.has(parsed.hostname)) return null;
    return parsed;
}

/**
 * AI Proxy Route
 * Routes requests to OpenAI/DeepSeek/Google APIs while adding the API key
 * server-side. This is used with ClientSideTransport's fetchViaProxy pattern.
 *
 * Query params:
 * - provider: "openai" | "deepseek" | "google"
 * - url: The target URL to proxy to (must be an allowlisted provider host)
 */
export async function POST(req: NextRequest) {
    try {
        const url = req.nextUrl.searchParams.get("url");
        const provider = req.nextUrl.searchParams.get("provider");

        // Get API key from headers (sent by client)
        const apiKey = req.headers.get("X-API-Key");

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        if (!apiKey) {
            return NextResponse.json({ error: "API key is required" }, { status: 401 });
        }

        // Decode the URL and reject anything not pointing at an allowed provider.
        const decodedUrl = decodeURIComponent(url);
        const target = isAllowedTarget(decodedUrl);
        if (!target) {
            return NextResponse.json(
                { error: "Target URL is not allowed" },
                { status: 403 }
            );
        }

        // Clone the request body
        const body = await req.text();

        // Copy all headers except host
        const headers = new Headers();
        req.headers.forEach((value, key) => {
            if (key.toLowerCase() !== "host" && key.toLowerCase() !== "x-api-key") {
                headers.set(key, value);
            }
        });

        // Set the proper authorization header for the LLM provider
        if (provider === "google") {
            headers.set("x-goog-api-key", apiKey);
        } else {
            headers.set("Authorization", `Bearer ${apiKey}`);
        }
        headers.set("Content-Type", "application/json");

        // Make the request to the validated LLM provider URL
        const response = await fetch(target.toString(), {
            method: "POST",
            headers,
            body,
        });

        // If not OK, return error
        if (!response.ok) {
            const errorText = await response.text();
            return new NextResponse(errorText, {
                status: response.status,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Stream the response back
        return new NextResponse(response.body, {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "application/json",
            },
        });
    } catch (error: any) {
        console.error("[AI Proxy] Error:", error);
        return NextResponse.json(
            { error: error?.message || "Proxy error occurred" },
            { status: 500 }
        );
    }
}
