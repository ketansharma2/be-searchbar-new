import type { Response, CookieOptions } from 'express';
import { env } from '../config/env';
import { ttlToDate } from './jwt';

export const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * HttpOnly + Secure + SameSite=Lax cookie config.
 *
 * Note: SameSite=Lax allows cookies to be sent on top-level navigation
 * (like page refreshes), which is needed for the refresh token flow.
 * In production, host both under one parent domain and set COOKIE_DOMAIN.
 */
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: 'lax',
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
