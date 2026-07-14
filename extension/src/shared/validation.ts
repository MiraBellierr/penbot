import {
  ACTIONS,
  type BackgroundMessage,
  type TransformResponse,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isBackgroundMessage(
  value: unknown,
): value is BackgroundMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'OPEN_TOOLBAR') {
    return (
      value.action === undefined ||
      (typeof value.action === 'string' &&
        ACTIONS.includes(value.action as never))
    );
  }
  if (value.type === 'CANCEL_TRANSFORM')
    return typeof value.requestId === 'string';
  if (value.type !== 'TRANSFORM' || !isRecord(value.request)) return false;
  return (
    typeof value.requestId === 'string' &&
    typeof value.request.action === 'string' &&
    ACTIONS.includes(value.request.action as never) &&
    typeof value.request.text === 'string' &&
    value.request.text.trim().length > 0 &&
    value.request.text.length <= 10_000
  );
}

export function parseTransformResponse(value: unknown): TransformResponse {
  if (!isRecord(value) || typeof value.success !== 'boolean')
    throw new Error('The backend returned an invalid response.');
  if (!value.success) {
    const error = value.error;
    if (
      !isRecord(error) ||
      typeof error.code !== 'string' ||
      typeof error.message !== 'string'
    ) {
      throw new Error('The backend returned an invalid error response.');
    }
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }
  const data = value.data;
  if (
    !isRecord(data) ||
    typeof data.result !== 'string' ||
    data.result.trim().length === 0
  ) {
    throw new Error('The backend returned an empty or invalid result.');
  }
  const result = { result: data.result } as {
    result: string;
    romanized?: string;
    englishTranslation?: string;
    detectedSourceLanguage?: string;
  };
  for (const key of [
    'romanized',
    'englishTranslation',
    'detectedSourceLanguage',
  ] as const) {
    const candidate = data[key];
    if (candidate !== undefined && typeof candidate !== 'string')
      throw new Error(`Invalid ${key} in backend response.`);
    if (typeof candidate === 'string') result[key] = candidate;
  }
  return { success: true, data: result };
}
