import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import type { Role } from '../models/User';

// Augment Express's Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Requires a valid Bearer access token in the Authorization header.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    console.log('[cors-debug] requireAuth: no Authorization header', { path: req.path });
    throw ApiError.unauthorized('Missing access token');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyAccessToken(token);
    console.log('[cors-debug] requireAuth: verified', { path: req.path, sub: req.user.sub, role: req.user.role });
    next();
  } catch (err) {
    console.log('[cors-debug] requireAuth: verification failed', { path: req.path, error: (err as Error).message });
    throw ApiError.unauthorized('Invalid or expired access token');
  }
}

/**
 * Role guard — use after requireAuth.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated');
    }
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have access to this resource');
    }
    next();
  };
}
