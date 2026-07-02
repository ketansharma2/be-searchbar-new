import type { Request, Response, NextFunction } from 'express';
import { ZodError, type AnyZodObject } from 'zod';
import { ApiError } from '../utils/ApiError';

// The parsed, typed request data is attached here for controllers to consume.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validated?: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}

/**
 * Validates `req.body`, `req.query`, and `req.params` against a Zod schema.
 * On success, the coerced/typed data is available on `req.validated`
 * (and `req.body` is replaced for backwards compatibility). `req.query` is a
 * read-only getter in newer Express, so controllers should read coerced query
 * values from `req.validated.query`.
 */
export const validate =
  (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };
      req.validated = parsed;
      if (parsed.body) req.body = parsed.body;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // Key errors by field name (strip the leading body/query/params segment).
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const path = issue.path.slice(1).join('.') || String(issue.path[0] ?? 'form');
          (fieldErrors[path] ??= []).push(issue.message);
        }
        next(ApiError.badRequest('Validation failed', fieldErrors));
        return;
      }
      next(err);
    }
  };
