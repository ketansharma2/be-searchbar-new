import type { Response, CookieOptions } from 'express';
import { env } from '../config/env';
import { ttlToDate } from './jwt';

export const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * HttpOnly + Secure + SameSite cookie config, driven by env.
 *
 * Recommended (same-site) production deployment: put the frontend and backend
 * under one registrable domain — e.g. app.mavenjobs.in + api.mavenjobs.in — and:
 *   COOKIE_DOMAIN=.mavenjobs.in   (cookie shared across both subdomains)
 *   COOKIE_SAMESITE=lax           (first-party — sent on same-site requests)
 *   COOKIE_SECURE=true            (HTTPS only)
 * This keeps the refresh cookie first-party, so it survives browser third-party
 * cookie blocking and is also readable by the Next.js middleware (proxy.ts).
 *
 * Cross-site deployment (AWS Amplify frontend + Render backend — different
 * registrable domains): COOKIE_DOMAIN MUST be empty. Domain can only be the
 * issuing host's own domain (Render's), and amplifyapp.com is on the Public
 * Suffix List, so a cookie scoped to it is rejected by the browser outright —
 * this is what silently dropped the refresh cookie in production. SameSite
 * must be 'none' (a 'lax' cookie is never attached to cross-site XHR/fetch),
 * which requires COOKIE_SECURE=true:
 *   COOKIE_DOMAIN=   COOKIE_SAMESITE=none   COOKIE_SECURE=true
 *
 * Localhost dev: leave COOKIE_DOMAIN empty, COOKIE_SECURE=false, COOKIE_SAMESITE=lax.
 */
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    domain: env.cookie.domain,
    path: '/',
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  const options = { ...baseCookieOptions(), expires: ttlToDate(env.jwt.refreshTtl) };
  res.cookie(REFRESH_COOKIE_NAME, token, options);
  console.log('[cors-debug] setRefreshCookie', {
    domain: options.domain ?? '(host-only)',
    secure: options.secure,
    sameSite: options.sameSite,
    expires: options.expires,
  });
}

export function clearRefreshCookie(res: Response): void {
  // Options (except expiry/maxAge) must match those used when setting it.
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}
