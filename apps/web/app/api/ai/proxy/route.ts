import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * AI Proxy Route
 * Routes requests to OpenAI/DeepSeek APIs while adding the API key server-side.
 * This is used with ClientSideTransport's fetchViaProxy pattern.
 * 
 * Query params:
 * - provider: "openai" or "deepseek"
 * - url: The target URL to proxy to
 */
export async function POST(req: NextRequest) {
    try {
        const url = req.nextUrl.searchParams.get("url");
        const provider = req.nextUrl.searchParams.get("provider");

        // Get API key from headers (sent by client)
        const apiKey = req.headers.get("X-API-Key");

        if (!url) {
            console.log("[AI Proxy] ❌ No URL provided");
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        if (!apiKey) {
            console.log("[AI Proxy] ❌ No API key provided");
            return NextResponse.json({ error: "API key is required" }, { status: 401 });
        }

        console.log(`[AI Proxy] ✓ Proxying to ${provider} | API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);
        console.log(`[AI Proxy] ✓ Target URL: ${url}`);

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
        headers.set("Authorization", `Bearer ${apiKey}`);
        headers.set("Content-Type", "application/json");

        // Make the request to the LLM provider
        const response = await fetch(url, {
            method: "POST",
            headers,
            body,
        });

        console.log(`[AI Proxy] ✓ Response status: ${response.status}`);

        // If not OK, log the error
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`[AI Proxy] ❌ Error response: ${errorText}`);
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
