import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAIConfig } from '../lib/use-ai-config';
import { LOCAL_STORAGE_KEYS, AI_CONFIG_EVENT } from '../lib/constants';

describe('useAIConfig', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should return default config when localStorage is empty', async () => {
        const { result } = renderHook(() => useAIConfig());

        await waitFor(() => {
            expect(result.current.loaded).toBe(true);
        });

        expect(result.current.config.provider).toBe('deepseek');
        expect(result.current.config.model).toBe('deepseek-v4-flash');
        expect(result.current.config.apiKey).toBe('');
    });

    it('should load config from localStorage', async () => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PROVIDER, 'openai');
        localStorage.setItem(LOCAL_STORAGE_KEYS.MODEL, 'gpt-5.4-mini');
        localStorage.setItem(LOCAL_STORAGE_KEYS.API_KEY, 'test-key-123');

        const { result } = renderHook(() => useAIConfig());

        await waitFor(() => {
            expect(result.current.loaded).toBe(true);
        });

        expect(result.current.config.provider).toBe('openai');
        expect(result.current.config.model).toBe('gpt-5.4-mini');
        expect(result.current.config.apiKey).toBe('test-key-123');
    });

    it('should fallback to default model if saved model is invalid for provider', async () => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PROVIDER, 'openai');
        localStorage.setItem(LOCAL_STORAGE_KEYS.MODEL, 'invalid-model');

        const { result } = renderHook(() => useAIConfig());

        await waitFor(() => {
            expect(result.current.loaded).toBe(true);
        });

        expect(result.current.config.provider).toBe('openai');
        expect(result.current.config.model).toBe('gpt-5.4-mini'); // First OpenAI model
    });

    it('should fallback to default provider if saved provider is invalid', async () => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PROVIDER, 'invalid-provider');

        const { result } = renderHook(() => useAIConfig());

        await waitFor(() => {
            expect(result.current.loaded).toBe(true);
        });

        expect(result.current.config.provider).toBe('deepseek');
    });

    it('should update config when AI_CONFIG_EVENT is dispatched', async () => {
        const { result } = renderHook(() => useAIConfig());

        await waitFor(() => {
            expect(result.current.loaded).toBe(true);
        });

        // Update localStorage and dispatch event
        act(() => {
            localStorage.setItem(LOCAL_STORAGE_KEYS.PROVIDER, 'google');
            localStorage.setItem(LOCAL_STORAGE_KEYS.MODEL, 'gemini-3.5-flash');
            localStorage.setItem(LOCAL_STORAGE_KEYS.API_KEY, 'new-key');
            window.dispatchEvent(new Event(AI_CONFIG_EVENT));
        });

        await waitFor(() => {
            expect(result.current.config.provider).toBe('google');
        });

        expect(result.current.config.model).toBe('gemini-3.5-flash');
        expect(result.current.config.apiKey).toBe('new-key');
    });
});
