import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  deepseekApiKey: '',
  deepseekModel: 'deepseek-v4-flash',
  deepseekEnableThinking: false,
  sourceLanguage: 'auto',
  targetLanguage: 'English',
  dialect: 'none',
  customInstructions: '',
  theme: 'system',
  autoShow: true,
  maxSelectionLength: 10_000,
  requestTimeoutMs: 30_000,
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set(settings);
}
