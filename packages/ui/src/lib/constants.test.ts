import { describe, it, expect } from 'vitest';
import {
    LOCAL_STORAGE_KEYS,
    AI_CONFIG_EVENT,
    SUPPORTED_PROVIDERS,
    DEFAULT_AI_CONFIG,
    MODEL_OPTIONS,
    type Provider,
} from '../lib/constants';

describe('constants', () => {
    describe('LOCAL_STORAGE_KEYS', () => {
        it('should have correct keys', () => {
            expect(LOCAL_STORAGE_KEYS.PROVIDER).toBe('yosi_ai_provider');
            expect(LOCAL_STORAGE_KEYS.MODEL).toBe('yosi_ai_model');
            expect(LOCAL_STORAGE_KEYS.API_KEY).toBe('yosi_ai_api_key');
        });
    });

    describe('AI_CONFIG_EVENT', () => {
        it('should be the correct event name', () => {
            expect(AI_CONFIG_EVENT).toBe('yosi_ai_config_updated');
        });
    });

    describe('SUPPORTED_PROVIDERS', () => {
        it('should include all providers', () => {
            expect(SUPPORTED_PROVIDERS).toContain('deepseek');
            expect(SUPPORTED_PROVIDERS).toContain('openai');
            expect(SUPPORTED_PROVIDERS).toContain('google');
            expect(SUPPORTED_PROVIDERS).toHaveLength(3);
        });
    });

    describe('DEFAULT_AI_CONFIG', () => {
        it('should have correct defaults', () => {
            expect(DEFAULT_AI_CONFIG.provider).toBe('deepseek');
            expect(DEFAULT_AI_CONFIG.model).toBe('deepseek-chat');
            expect(DEFAULT_AI_CONFIG.apiKey).toBe('');
        });
    });

    describe('MODEL_OPTIONS', () => {
        it('should have options for all providers', () => {
            const providers: Provider[] = ['deepseek', 'openai', 'google'];
            providers.forEach((provider) => {
                expect(MODEL_OPTIONS[provider]).toBeDefined();
                expect(MODEL_OPTIONS[provider].length).toBeGreaterThan(0);
            });
        });

        it('should have correct structure for each model option', () => {
            Object.values(MODEL_OPTIONS).forEach((options) => {
                options.forEach((option) => {
                    expect(option).toHaveProperty('value');
                    expect(option).toHaveProperty('label');
                    expect(typeof option.value).toBe('string');
                    expect(typeof option.label).toBe('string');
                });
            });
        });

        it('should include deepseek-chat as first deepseek option', () => {
            expect(MODEL_OPTIONS.deepseek[0].value).toBe('deepseek-chat');
        });
    });
});
