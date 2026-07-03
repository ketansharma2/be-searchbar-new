import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as usageService from '../services/usage.service';

/** GET /api/usage/me — the requesting user's own download usage today. */
export const myUsage = asyncHandler(async (req: Request, res: Response) => {
  const usage = await usageService.getMyUsage(req.user!.sub, req.user!.role);
  res.status(200).json({ success: true, usage });
});

/** GET /api/usage/summary — org-wide usage snapshot (admin). */
export const globalUsage = asyncHandler(async (_req: Request, res: Response) => {
  const usage = await usageService.getGlobalUsage();
  res.status(200).json({ success: true, usage });
});
