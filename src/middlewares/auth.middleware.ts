import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, setAccessCookie, setRefreshCookie } from '../utils/cookies';
import { rotateRefreshToken } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
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
 * Requires a valid session, authenticated entirely from cookies.
 *
 * If the access-token cookie is missing/expired, the refresh-token cookie is
 * transparently rotated and both cookies are re-issued on the response
 * before the request continues — the client never sees the expiry and never
 * needs to drive a refresh itself.
 */
export const requireAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const accessToken = req.cookies?.[ACCESS_COOKIE_NAME] as string | undefined;
    if (accessToken) {
      try {
        req.user = verifyAccessToken(accessToken);
        return next();
      } catch {
        // Expired or invalid — fall through to a silent refresh below.
      }
    }

    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const { user, tokens } = await rotateRefreshToken(refreshToken);
    setAccessCookie(res, tokens.accessToken);
    setRefreshCookie(res, tokens.refreshToken);
    req.user = { sub: user.id, role: user.role, email: user.email, name: user.name };
    next();
  }
);

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
