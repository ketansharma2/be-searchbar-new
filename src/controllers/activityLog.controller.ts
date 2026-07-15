import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as activityLogService from '../services/activityLog.service';
import type { ListActivityLogsQuery } from '../validators/activityLog.validators';

/** GET /api/activity-logs */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as ListActivityLogsQuery;
  const result = await activityLogService.listActivityLogs(query, {
    id: req.user!.sub,
    role: req.user!.role,
  });
  res.status(200).json({ success: true, ...result });
});
