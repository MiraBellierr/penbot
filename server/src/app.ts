import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Environment } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { createTransformRouter } from './routes/transformRoutes.js';
import { DeepSeekService } from './services/DeepSeekService.js';

export function createApp(
  environment: Environment,
  service = new DeepSeekService(environment),
) {
  const app = express();
  const allowed = new Set(
    environment.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || allowed.has(origin));
      },
    }),
  );
  app.use(express.json({ limit: '32kb', strict: true }));
  app.get('/health', (_request, response) =>
    response.json({
      status: 'ok',
      provider: 'DeepSeek',
      model: environment.DEEPSEEK_MODEL,
    }),
  );
  app.use(
    '/api',
    createRateLimiter(environment),
    createTransformRouter(service, environment),
  );
  app.use((_request, response) => {
    response.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found.' },
    });
  });
  app.use(errorHandler);
  return app;
}
