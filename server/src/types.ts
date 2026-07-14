export const actions = [
  'grammar',
  'standard',
  'fluent',
  'formal',
  'answer',
  'translate',
] as const;
export type TransformAction = (typeof actions)[number];
export type Dialect = 'american' | 'british' | 'australian' | 'none';

export interface TransformRequest {
  action: TransformAction;
  text: string;
  sourceLanguage?: string | undefined;
  targetLanguage?: string | undefined;
  variationSeed?: string | undefined;
  preferences?:
    | { dialect?: Dialect | undefined; customInstructions?: string | undefined }
    | undefined;
}

export interface TransformResult {
  result: string;
  romanized?: string;
  englishTranslation?: string;
  detectedSourceLanguage?: string;
}
