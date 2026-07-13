import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import {
  setAccessCookie,
  clearAccessCookie,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
} from '../utils/cookies';

/**
 * POST /api/auth/login
 * Validates credentials, sets access + refresh cookies, returns { user }.
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.login(req.body);
  setAccessCookie(res, tokens.accessToken);
  setRefreshCookie(res, tokens.refreshToken);
  res.status(200).json({ success: true, user });
});

/**
 * POST /api/auth/refresh
 * Rotates the refresh token and re-issues both cookies.
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  const { user, tokens } = await authService.rotateRefreshToken(presented);
  setAccessCookie(res, tokens.accessToken);
  setRefreshCookie(res, tokens.refreshToken);
  res.status(200).json({ success: true, user });
});

/**
 * POST /api/auth/logout
 * Invalidates the refresh token and clears both cookies.
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logout(presented);
  clearAccessCookie(res);
  clearRefreshCookie(res);
  res.status(200).json({ success: true, message: 'Logged out' });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user (requires access token).
 */
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getUserById(req.user!.sub);
  res.status(200).json({ success: true, user });
});
