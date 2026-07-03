import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Central error handler. Must be registered last.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error && err.name === 'MulterError') {
    // File too large / unexpected field / etc.
    statusCode = 400;
    message =
      (err as { code?: string }).code === 'LIMIT_FILE_SIZE'
        ? 'File is too large'
        : err.message;
  } else if (err instanceof Error) {
    // Mongo duplicate key
    if ('code' in err && (err as { code?: number }).code === 11000) {
      statusCode = 409;
      message = 'Resource already exists';
    } else {
      message = err.message || message;
    }
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(env.isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
}
