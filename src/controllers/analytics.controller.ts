import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as analyticsService from '../services/analytics.service';
import type { AnalyticsBreakdownQuery, AnalyticsSummaryQuery } from '../validators/analytics.validators';

/** GET /api/analytics/summary */
export const summary = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as AnalyticsSummaryQuery;
  const summary = await analyticsService.getAnalyticsSummary(query);
  res.status(200).json({ success: true, summary });
});

/** GET /api/analytics/breakdown */
export const breakdown = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as AnalyticsBreakdownQuery;
    console.log("Analytics Query:", query);
  const result = await analyticsService.getAnalyticsBreakdown(query);
  res.status(200).json({ success: true, ...result });
});
