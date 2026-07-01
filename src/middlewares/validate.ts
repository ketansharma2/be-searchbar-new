import type { Request, Response, NextFunction } from 'express';
import { ZodError, type AnyZodObject } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Validates `req.body`, `req.query`, and `req.params` against a Zod schema.
 * On success, replaces the request parts with the parsed (typed/coerced) data.
 */
export const validate =
  (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
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
