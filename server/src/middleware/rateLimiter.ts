import rateLimit from 'express-rate-limit';
import type { Environment } from '../config/env.js';

export function createRateLimiter(environment: Environment) {
  return rateLimit({
    windowMs: environment.RATE_LIMIT_WINDOW_MS,
    limit: environment.RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again shortly.',
      },
    },
  });
}
