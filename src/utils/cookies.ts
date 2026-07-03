import type { Response, CookieOptions } from 'express';
import { env } from '../config/env';
import { ttlToDate } from './jwt';

export const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * HttpOnly + Secure + SameSite cookie config.
 *
 * For cross-origin deployments (frontend and backend on different domains):
 * - SameSite=none is required for cross-site cookies
 * - secure=true is mandatory when SameSite=none (HTTPS only)
 * 
 * Set COOKIE_SECURE=true in production environment variables.
 */
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    expires: ttlToDate(env.jwt.refreshTtl),
  });
}

export function clearRefreshCookie(res: Response): void {
  // Options (except expiry/maxAge) must match those used when setting it.
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}
