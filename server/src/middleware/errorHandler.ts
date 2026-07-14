import type { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  void next;
  const safe =
    error instanceof AppError
      ? error
      : new AppError('INTERNAL_ERROR', 'The text could not be processed.', 500);
  response.status(safe.status).json({
    success: false,
    error: { code: safe.code, message: safe.message },
  });
};
