import { Router } from 'express';
import { createTransformController } from '../controllers/transformController.js';
import type { Environment } from '../config/env.js';
import type { DeepSeekService } from '../services/DeepSeekService.js';

export function createTransformRouter(
  service: DeepSeekService,
  environment: Environment,
): Router {
  const router = Router();
  router.post(
    '/transform',
    createTransformController(service, environment.REQUEST_TIMEOUT_MS),
  );
  return router;
}
