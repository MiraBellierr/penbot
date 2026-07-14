import type { Settings, TextAction, TransformRequest } from './types';

export function buildTransformRequest(
  action: TextAction,
  text: string,
  settings: Pick<Settings, 'dialect' | 'customInstructions'>,
  sourceLanguage: string,
  targetLanguage: string,
  variationSeed: string,
): TransformRequest {
  return {
    action,
    text,
    sourceLanguage,
    targetLanguage,
    variationSeed,
    preferences: {
      dialect: settings.dialect,
      customInstructions: settings.customInstructions,
    },
  };
}
