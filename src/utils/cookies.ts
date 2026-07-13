import type { Response, CookieOptions } from 'express';
import { env } from '../config/env';
import { ttlToDate } from './jwt';

export const ACCESS_COOKIE_NAME = 'accessToken';
export const REFRESH_COOKIE_NAME = 'refreshToken';

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    domain: env.cookie.domain,
    path: '/',
  };
}

export function setAccessCookie(res: Response, token: string): void {
  const options = { ...baseCookieOptions(), expires: ttlToDate(env.jwt.accessTtl) };
  res.cookie(ACCESS_COOKIE_NAME, token, options);
}

export function clearAccessCookie(res: Response): void {
  // Options (except expiry/maxAge) must match those used when setting it.
  res.clearCookie(ACCESS_COOKIE_NAME, baseCookieOptions());
}

export function setRefreshCookie(res: Response, token: string): void {
  const options = { ...baseCookieOptions(), expires: ttlToDate(env.jwt.refreshTtl) };
  res.cookie(REFRESH_COOKIE_NAME, token, options);
}

export function clearRefreshCookie(res: Response): void {
  // Options (except expiry/maxAge) must match those used when setting it.
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}
