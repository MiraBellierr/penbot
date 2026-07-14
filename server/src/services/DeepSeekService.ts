import OpenAI from 'openai';
import type { Environment } from '../config/env.js';
import { translationResponseSchema } from '../schemas/transformSchema.js';
import type { TransformRequest, TransformResult } from '../types.js';
import { AppError } from '../utils/AppError.js';
import { TransformPromptBuilder } from './TransformPromptBuilder.js';

type DeepSeekRequest =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    extra_body: { thinking: { type: 'disabled' | 'enabled' } };
  };

export interface CompletionTransport {
  create(
    request: DeepSeekRequest,
    options: { signal: AbortSignal; timeout: number },
  ): Promise<{ choices: Array<{ message: { content: string | null } }> }>;
}

export class OpenAICompletionTransport implements CompletionTransport {
  readonly #client: OpenAI;
  constructor(environment: Environment) {
    this.#client = new OpenAI({
      apiKey: environment.DEEPSEEK_API_KEY,
      baseURL: environment.DEEPSEEK_BASE_URL,
    });
  }
  async create(
    request: DeepSeekRequest,
    options: { signal: AbortSignal; timeout: number },
  ) {
    return this.#client.chat.completions.create(request, options);
  }
}

export class DeepSeekService {
  readonly #prompts = new TransformPromptBuilder();
  constructor(
    private readonly environment: Environment,
    private readonly transport: CompletionTransport = new OpenAICompletionTransport(
      environment,
    ),
  ) {}

  async transform(
    request: TransformRequest,
    signal: AbortSignal,
  ): Promise<TransformResult> {
    const { systemPrompt, userPrompt } = this.#prompts.build(request);
    const thinkingEnabled =
      request.action === 'answer' &&
      this.environment.DEEPSEEK_ENABLE_THINKING_FOR_ANSWERS;
    const body: DeepSeekRequest = {
      model: this.environment.DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      extra_body: {
        thinking: { type: thinkingEnabled ? 'enabled' : 'disabled' },
      },
      ...(thinkingEnabled ? { reasoning_effort: 'high' as const } : {}),
      ...(request.action === 'translate'
        ? { response_format: { type: 'json_object' as const } }
        : {}),
    };
    let completion: Awaited<ReturnType<CompletionTransport['create']>>;
    try {
      completion = await this.transport.create(body, {
        signal,
        timeout: this.environment.REQUEST_TIMEOUT_MS,
      });
    } catch (cause) {
      if (signal.aborted)
        throw new AppError(
          'REQUEST_ABORTED',
          'The request took too long and was cancelled.',
          408,
        );
      throw this.mapUpstreamError(cause);
    }
    const content = completion.choices[0]?.message.content?.trim();
    if (!content)
      throw new AppError(
        'EMPTY_MODEL_RESPONSE',
        'DeepSeek returned an empty response.',
        502,
      );
    if (request.action !== 'translate') return { result: content };
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AppError(
        'INVALID_TRANSLATION_JSON',
        'The translation response could not be validated.',
        502,
      );
    }
    const translation = translationResponseSchema.safeParse(parsed);
    if (!translation.success)
      throw new AppError(
        'INVALID_TRANSLATION_RESPONSE',
        'The translation response could not be validated.',
        502,
      );
    const result: TransformResult = {
      result: translation.data.translatedText,
      detectedSourceLanguage: translation.data.detectedSourceLanguage,
    };
    if (translation.data.romanized)
      result.romanized = translation.data.romanized;
    if (translation.data.englishTranslation)
      result.englishTranslation = translation.data.englishTranslation;
    return result;
  }

  private mapUpstreamError(cause: unknown): AppError {
    if (cause instanceof OpenAI.APIError) {
      if (cause.status === 401 || cause.status === 403)
        return new AppError(
          'AUTHENTICATION_FAILED',
          'The DeepSeek backend is not authenticated.',
          502,
        );
      if (cause.status === 402)
        return new AppError(
          'INSUFFICIENT_BALANCE',
          'The DeepSeek account has insufficient balance.',
          503,
        );
      if (cause.status === 429)
        return new AppError(
          'RATE_LIMITED',
          'DeepSeek rate limit reached. Please try again shortly.',
          429,
        );
      if (cause.status === 400)
        return new AppError(
          'INVALID_UPSTREAM_REQUEST',
          'DeepSeek could not process this request.',
          400,
        );
      if (cause.status && cause.status >= 500)
        return new AppError(
          'DEEPSEEK_UNAVAILABLE',
          'DeepSeek is temporarily unavailable. Please try again.',
          503,
        );
    }
    return new AppError(
      'DEEPSEEK_REQUEST_FAILED',
      'The text could not be processed.',
      502,
    );
  }
}
