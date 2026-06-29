import type { Provider } from "./constants";

/**
 * Provider-specific tweaks applied to the outgoing chat-completion request body.
 *
 * DeepSeek V4 (flash/pro) are hybrid "thinking" models with reasoning enabled by
 * default. In thinking mode the API rejects `tool_choice`
 * ("Thinking mode does not support this tool_choice"), but BlockNote's AI
 * extension requires forced tool calling (`tool_choice: "required"`) to produce
 * structured document edits. Disabling thinking mode restores tool support and
 * yields faster, deterministic edits — the right default for an inline editor.
 *
 * The `@ai-sdk/openai-compatible` provider has no `extraBody` hook, so we inject
 * the field into the JSON body of the request as it passes through our proxy
 * fetch wrapper (see yosi-transport.ts).
 *
 * @see https://api-docs.deepseek.com/guides/thinking_mode
 */
export function applyProviderRequestBody(
    provider: Provider,
    body: BodyInit | null | undefined,
): BodyInit | null | undefined {
    // Only DeepSeek needs adjusting, and only when the body is a JSON string we
    // can safely parse and re-serialize.
    if (provider !== "deepseek" || typeof body !== "string") {
        return body;
    }

    try {
        const parsed = JSON.parse(body);
        // Guard against arrays / primitives — we only extend plain objects.
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return JSON.stringify({ ...parsed, thinking: { type: "disabled" } });
        }
    } catch {
        // Not JSON we can parse (e.g. a binary/stream body) — forward unchanged.
    }

    return body;
}
