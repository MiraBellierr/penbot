import type { TransformRequest, TransformResponse } from './types';
import { buildPrompts } from './prompts';

interface DeepSeekCallOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  enableThinking: boolean;
  signal: AbortSignal;
}

export async function callDeepSeek(
  request: TransformRequest,
  options: DeepSeekCallOptions,
): Promise<TransformResponse> {
  const { systemPrompt, userPrompt } = buildPrompts({
    action: request.action,
    text: request.text,
    sourceLanguage: request.sourceLanguage,
    targetLanguage: request.targetLanguage,
    dialect: request.preferences?.dialect,
    customInstructions: request.preferences?.customInstructions,
    variationSeed: request.variationSeed,
  });

  const thinkingEnabled =
    request.action === 'answer' && options.enableThinking;

  const body: Record<string, unknown> = {
    model: options.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
  };

  if (thinkingEnabled) {
    body.reasoning_effort = 'high';
    body.thinking = { type: 'enabled' };
  }

  if (request.action === 'translate') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(
    `${options.baseUrl.replace(/\/$/, '')}/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: options.signal,
    },
  );

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message:
            'DeepSeek rejected the API key. Check your key in extension settings.',
        },
      };
    }
    if (status === 402) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Your DeepSeek account has insufficient balance.',
        },
      };
    }
    if (status === 429) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'DeepSeek is rate-limiting requests. Wait a moment and retry.',
        },
      };
    }
    if (status >= 500) {
      return {
        success: false,
        error: {
          code: 'DEEPSEEK_UNAVAILABLE',
          message: 'DeepSeek is temporarily unavailable. Try again later.',
        },
      };
    }
    return {
      success: false,
      error: {
        code: 'DEEPSEEK_REQUEST_FAILED',
        message: `DeepSeek returned an error (HTTP ${status}).`,
      },
    };
  }

  const json: unknown = await response.json();

  if (
    !json ||
    typeof json !== 'object' ||
    !('choices' in json) ||
    !Array.isArray((json as Record<string, unknown>).choices)
  ) {
    return {
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'DeepSeek returned an unexpected response.',
      },
    };
  }

  const completion = json as {
    choices: Array<{ message?: { content?: string } }>;
  };
  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    return {
      success: false,
      error: {
        code: 'EMPTY_MODEL_RESPONSE',
        message: 'DeepSeek returned an empty response.',
      },
    };
  }

  if (request.action !== 'translate') {
    return { success: true, data: { result: content } };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      success: false,
      error: {
        code: 'INVALID_TRANSLATION_RESPONSE',
        message: 'DeepSeek did not return valid JSON for translation.',
      },
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      error: {
        code: 'INVALID_TRANSLATION_RESPONSE',
        message: 'DeepSeek returned an invalid translation response.',
      },
    };
  }

  const obj = parsed as Record<string, unknown>;
  const translatedText = obj.translatedText;
  if (typeof translatedText !== 'string' || translatedText.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_TRANSLATION_RESPONSE',
        message: 'DeepSeek returned an empty translation.',
      },
    };
  }

  const result: TransformResponse = {
    success: true,
    data: { result: translatedText },
  };

  const detectedSourceLanguage = obj.detectedSourceLanguage;
  if (typeof detectedSourceLanguage === 'string') {
    result.data.detectedSourceLanguage = detectedSourceLanguage;
  }

  const romanized = obj.romanized;
  if (typeof romanized === 'string') {
    result.data.romanized = romanized;
  }

  const englishTranslation = obj.englishTranslation;
  if (typeof englishTranslation === 'string') {
    result.data.englishTranslation = englishTranslation;
  }

  return result;
}
