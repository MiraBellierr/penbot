import { z } from 'zod';
import { actions } from '../types.js';

export const transformRequestSchema = z
  .object({
    action: z.enum(actions),
    text: z.string().trim().min(1).max(10_000),
    sourceLanguage: z.string().trim().max(100).optional(),
    targetLanguage: z.string().trim().max(100).optional(),
    variationSeed: z.string().trim().max(200).optional(),
    preferences: z
      .object({
        dialect: z
          .enum(['american', 'british', 'australian', 'none'])
          .optional(),
        customInstructions: z.string().max(1_000).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === 'translate' && !value.targetLanguage) {
      context.addIssue({
        code: 'custom',
        path: ['targetLanguage'],
        message: 'Target language is required for translation.',
      });
    }
  });

export const translationResponseSchema = z
  .object({
    translatedText: z.string().trim().min(1),
    romanized: z.string().trim().min(1).nullable(),
    englishTranslation: z.string().trim().min(1).nullable(),
    detectedSourceLanguage: z.string().trim().min(1),
  })
  .strict();
