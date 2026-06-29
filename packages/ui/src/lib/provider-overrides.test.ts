import { describe, it, expect } from "vitest";
import { applyProviderRequestBody } from "./provider-overrides";

describe("applyProviderRequestBody", () => {
    const chatBody = JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [{ role: "user", content: "hi" }],
        tool_choice: "required",
    });

    it("disables thinking mode for deepseek and preserves existing fields", () => {
        const result = applyProviderRequestBody("deepseek", chatBody);
        const parsed = JSON.parse(result as string);

        expect(parsed.thinking).toEqual({ type: "disabled" });
        // Existing fields must be untouched so tool calling still works.
        expect(parsed.model).toBe("deepseek-v4-pro");
        expect(parsed.tool_choice).toBe("required");
        expect(parsed.messages).toHaveLength(1);
    });

    it("leaves openai bodies unchanged", () => {
        const result = applyProviderRequestBody("openai", chatBody);
        expect(result).toBe(chatBody);
        expect(JSON.parse(result as string).thinking).toBeUndefined();
    });

    it("leaves google bodies unchanged", () => {
        const result = applyProviderRequestBody("google", chatBody);
        expect(result).toBe(chatBody);
    });

    it("forwards non-string bodies unchanged", () => {
        const stream = new Uint8Array([1, 2, 3]);
        expect(applyProviderRequestBody("deepseek", stream)).toBe(stream);
        expect(applyProviderRequestBody("deepseek", undefined)).toBeUndefined();
        expect(applyProviderRequestBody("deepseek", null)).toBeNull();
    });

    it("forwards unparseable bodies unchanged", () => {
        const notJson = "not-json";
        expect(applyProviderRequestBody("deepseek", notJson)).toBe(notJson);
    });

    it("does not extend non-object JSON bodies", () => {
        const arrayBody = JSON.stringify([1, 2, 3]);
        expect(applyProviderRequestBody("deepseek", arrayBody)).toBe(arrayBody);
    });
});
