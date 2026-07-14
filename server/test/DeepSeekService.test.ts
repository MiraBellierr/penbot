import OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';
import { loadEnvironment } from '../src/config/env.js';
import {
  DeepSeekService,
  type CompletionTransport,
} from '../src/services/DeepSeekService.js';
import type { TransformRequest } from '../src/types.js';

function environment(overrides: NodeJS.ProcessEnv = {}) {
  return loadEnvironment({
    NODE_ENV: 'test',
    DEEPSEEK_API_KEY: 'server-secret',
    ...overrides,
  });
}

function transportWith(
  content: string | null,
): CompletionTransport & { create: ReturnType<typeof vi.fn> } {
  return {
    create: vi.fn().mockResolvedValue({ choices: [{ message: { content } }] }),
  };
}

const fluent: TransformRequest = {
  action: 'fluent',
  text: 'i want ask',
  variationSeed: 'one',
};

describe('DeepSeekService', () => {
  it('uses DeepSeek-V4-Flash and disables thinking by default', async () => {
    const transport = transportWith('I wanted to ask.');
    const service = new DeepSeekService(environment(), transport);
    await expect(
      service.transform(fluent, new AbortController().signal),
    ).resolves.toEqual({ result: 'I wanted to ask.' });
    const request = transport.create.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(request.model).toBe('deepseek-v4-flash');
    expect(request.extra_body).toEqual({ thinking: { type: 'disabled' } });
    expect(request).not.toHaveProperty('reasoning_effort');
    expect(JSON.stringify(request)).not.toContain('server-secret');
  });

  it('optionally enables thinking only for Answer and returns only content', async () => {
    const transport = transportWith('Could you share the date?');
    const service = new DeepSeekService(
      environment({ DEEPSEEK_ENABLE_THINKING_FOR_ANSWERS: 'true' }),
      transport,
    );
    await service.transform(
      { action: 'answer', text: 'Can you attend?' },
      new AbortController().signal,
    );
    const request = transport.create.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(request.extra_body).toEqual({ thinking: { type: 'enabled' } });
    expect(request.reasoning_effort).toBe('high');
  });

  it('parses and validates structured translations', async () => {
    const transport = transportWith(
      JSON.stringify({
        translatedText: 'こんにちは',
        romanized: 'Konnichiwa',
        englishTranslation: 'Hello',
        detectedSourceLanguage: 'English',
      }),
    );
    const service = new DeepSeekService(environment(), transport);
    await expect(
      service.transform(
        {
          action: 'translate',
          text: 'Hello',
          sourceLanguage: 'auto',
          targetLanguage: 'Japanese',
        },
        new AbortController().signal,
      ),
    ).resolves.toEqual({
      result: 'こんにちは',
      romanized: 'Konnichiwa',
      englishTranslation: 'Hello',
      detectedSourceLanguage: 'English',
    });
    expect(transport.create.mock.calls[0]?.[0]).toMatchObject({
      response_format: { type: 'json_object' },
      extra_body: { thinking: { type: 'disabled' } },
    });
  });

  it.each([
    ['', 'EMPTY_MODEL_RESPONSE'],
    ['not json', 'INVALID_TRANSLATION_JSON'],
  ])('rejects invalid output %j', async (content, code) => {
    const service = new DeepSeekService(environment(), transportWith(content));
    const request: TransformRequest = content
      ? { action: 'translate', text: 'Hello', targetLanguage: 'Japanese' }
      : fluent;
    await expect(
      service.transform(request, new AbortController().signal),
    ).rejects.toMatchObject({ code });
  });

  it('maps rate limits to a safe application error', async () => {
    const transport: CompletionTransport = {
      create: vi
        .fn()
        .mockRejectedValue(
          new OpenAI.APIError(429, {}, 'raw upstream body', new Headers()),
        ),
    };
    const service = new DeepSeekService(environment(), transport);
    await expect(
      service.transform(fluent, new AbortController().signal),
    ).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      message: expect.not.stringContaining('raw upstream'),
    });
  });

  it('handles request cancellation', async () => {
    const controller = new AbortController();
    const transport: CompletionTransport = {
      create: vi.fn(
        (_request, { signal }) =>
          new Promise<{
            choices: Array<{ message: { content: string | null } }>;
          }>((_resolve, reject) =>
            signal.addEventListener('abort', () =>
              reject(new Error('aborted')),
            ),
          ),
      ),
    };
    const service = new DeepSeekService(environment(), transport);
    const pending = service.transform(fluent, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'REQUEST_ABORTED' });
  });
});
