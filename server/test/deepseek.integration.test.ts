import { describe, expect, it } from 'vitest';
import { loadEnvironment } from '../src/config/env.js';
import { DeepSeekService } from '../src/services/DeepSeekService.js';

describe.skipIf(process.env.RUN_DEEPSEEK_INTEGRATION_TESTS !== 'true')(
  'manual DeepSeek integration',
  () => {
    it('calls the required endpoint and model', async () => {
      const environment = loadEnvironment();
      expect(environment.DEEPSEEK_BASE_URL).toBe('https://api.deepseek.com');
      expect(environment.DEEPSEEK_MODEL).toBe('deepseek-v4-flash');
      const result = await new DeepSeekService(environment).transform(
        { action: 'grammar', text: 'this are a manual integration test.' },
        new AbortController().signal,
      );
      expect(result.result.trim().length).toBeGreaterThan(0);
    });
  },
);
