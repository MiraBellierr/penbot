import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { loadEnvironment } from '../src/config/env.js';
import type { DeepSeekService } from '../src/services/DeepSeekService.js';

const env = loadEnvironment({
  NODE_ENV: 'test',
  DEEPSEEK_API_KEY: 'secret',
  RATE_LIMIT_MAX: '2',
});

describe('POST /api/transform', () => {
  it('validates requests and returns the stable response envelope', async () => {
    const service = {
      transform: vi.fn().mockResolvedValue({ result: 'Hello.' }),
    } as unknown as DeepSeekService;
    const response = await request(createApp(env, service))
      .post('/api/transform')
      .send({ action: 'grammar', text: 'hello.' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { result: 'Hello.' },
    });
  });

  it('requires a translation target and hides validation internals', async () => {
    const service = { transform: vi.fn() } as unknown as DeepSeekService;
    const response = await request(createApp(env, service))
      .post('/api/transform')
      .send({ action: 'translate', text: 'hello' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'INVALID_REQUEST', message: expect.any(String) },
    });
    expect(service.transform).not.toHaveBeenCalled();
  });

  it('applies rate limiting', async () => {
    const limitedEnv = loadEnvironment({
      NODE_ENV: 'test',
      DEEPSEEK_API_KEY: 'secret',
      RATE_LIMIT_MAX: '1',
    });
    const service = {
      transform: vi.fn().mockResolvedValue({ result: 'ok' }),
    } as unknown as DeepSeekService;
    const app = createApp(limitedEnv, service);
    await request(app)
      .post('/api/transform')
      .send({ action: 'grammar', text: 'one' });
    const response = await request(app)
      .post('/api/transform')
      .send({ action: 'grammar', text: 'two' });
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});
