import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as usageService from '../services/usage.service';
import type { UsageRangeQuery } from '../validators/usage.validators';

/** GET /api/usage/me — the requesting user's own download usage today (+ optional ?from&to range). */
export const myUsage = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as UsageRangeQuery;
  const usage = await usageService.getMyUsage(req.user!.sub, req.user!.role, query?.from, query?.to);
  res.status(200).json({ success: true, usage });
});

/** GET /api/usage/summary — org-wide usage snapshot (admin) (+ optional ?from&to range). */
export const globalUsage = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as UsageRangeQuery;
  const usage = await usageService.getGlobalUsage(query?.from, query?.to);
  res.status(200).json({ success: true, usage });
});
