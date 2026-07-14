export const ACTIONS = [
  'grammar',
  'standard',
  'fluent',
  'formal',
  'answer',
  'translate',
] as const;
export type TextAction = (typeof ACTIONS)[number];

export type Dialect = 'american' | 'british' | 'australian' | 'none';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  backendUrl: string;
  sourceLanguage: string;
  targetLanguage: string;
  dialect: Dialect;
  customInstructions: string;
  theme: Theme;
  autoShow: boolean;
  maxSelectionLength: number;
  requestTimeoutMs: number;
}

export interface TransformRequest {
  action: TextAction;
  text: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  variationSeed?: string;
  preferences?: { dialect?: Dialect; customInstructions?: string };
}

export interface TransformResult {
  result: string;
  romanized?: string;
  englishTranslation?: string;
  detectedSourceLanguage?: string;
}

export type BackgroundMessage =
  | { type: 'TRANSFORM'; requestId: string; request: TransformRequest }
  | { type: 'CANCEL_TRANSFORM'; requestId: string }
  | { type: 'OPEN_TOOLBAR'; action?: TextAction };

export type TransformResponse =
  | { success: true; data: TransformResult }
  | { success: false; error: { code: string; message: string } };
