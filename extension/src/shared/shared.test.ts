// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from './settings';
import { positionNearRect } from './positioning';
import { buildTransformRequest } from './transformClient';
import { parseTransformResponse } from './validation';
import { VariationHistory } from './variationHistory';

describe('shared extension utilities', () => {
  beforeEach(() => {
    const values: Record<string, unknown> = {};
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: vi.fn(async (defaults) => ({ ...defaults, ...values })),
          set: vi.fn(async (next) => Object.assign(values, next)),
        },
      },
    });
  });

  it('constructs the backend request without an API key', () => {
    const request = buildTransformRequest(
      'fluent',
      'hello',
      DEFAULT_SETTINGS,
      'auto',
      'English',
      'seed',
    );
    expect(request).toEqual({
      action: 'fluent',
      text: 'hello',
      sourceLanguage: 'auto',
      targetLanguage: 'English',
      variationSeed: 'seed',
      preferences: { dialect: 'none', customInstructions: '' },
    });
    expect(JSON.stringify(request)).not.toContain('API_KEY');
  });

  it('validates normal and translation result formatting', () => {
    expect(
      parseTransformResponse({
        success: true,
        data: {
          result: 'こんにちは',
          romanized: 'Konnichiwa',
          englishTranslation: 'Hello',
        },
      }),
    ).toEqual({
      success: true,
      data: {
        result: 'こんにちは',
        romanized: 'Konnichiwa',
        englishTranslation: 'Hello',
      },
    });
    expect(() =>
      parseTransformResponse({ success: true, data: { result: '' } }),
    ).toThrow();
  });

  it('persists the target language preference', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, targetLanguage: 'Japanese' });
    await expect(getSettings()).resolves.toMatchObject({
      targetLanguage: 'Japanese',
    });
  });

  it('keeps and navigates regeneration history', () => {
    const history = new VariationHistory();
    history.add({ result: 'first' });
    history.add({ result: 'second' });
    expect(history.current?.result).toBe('second');
    expect(history.previous()?.result).toBe('first');
    expect(history.next()?.result).toBe('second');
  });

  it('keeps a popup inside the viewport', () => {
    const rect = {
      left: 980,
      right: 1000,
      top: 740,
      bottom: 760,
      width: 20,
      height: 20,
    } as DOMRect;
    expect(positionNearRect(rect, 300, 200, 1024, 768)).toEqual({
      left: 716,
      top: 532,
    });
  });
});
