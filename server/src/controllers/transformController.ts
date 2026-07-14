import type { RequestHandler } from 'express';
import type { DeepSeekService } from '../services/DeepSeekService.js';
import { transformRequestSchema } from '../schemas/transformSchema.js';
import { AppError } from '../utils/AppError.js';

export function createTransformController(
  service: DeepSeekService,
  timeoutMs: number,
): RequestHandler {
  return async (request, response, next) => {
    const validated = transformRequestSchema.safeParse(request.body);
    if (!validated.success) {
      next(
        new AppError(
          'INVALID_REQUEST',
          'Check the selected text and transformation options.',
          400,
        ),
      );
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    request.once('aborted', () => controller.abort());
    response.once('close', () => {
      if (!response.writableEnded) controller.abort();
    });
    try {
      const result = await service.transform(validated.data, controller.signal);
      response.json({ success: true, data: result });
    } catch (cause) {
      next(cause);
    } finally {
      clearTimeout(timer);
    }
  };
}
