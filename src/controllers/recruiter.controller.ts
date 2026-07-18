import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as recruiterService from '../services/recruiter.service';
import type {
  ListRecruitersQuery,
  CreateRecruiterInput,
  UpdateRecruiterInput,
  RecruiterSummaryQuery,
} from '../validators/recruiter.validators';

/** GET /api/recruiters */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as ListRecruitersQuery;
  const result = await recruiterService.listRecruiters(query);
  res.status(200).json({ success: true, ...result });
});

/** GET /api/recruiters/summary — "recruiters added in range" dashboard KPI. */
export const summary = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as RecruiterSummaryQuery;
  const range = await recruiterService.getRecruiterRangeSummary(query.from, query.to);
  res.status(200).json({ success: true, range });
});

/** GET /api/recruiters/:id */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const recruiter = await recruiterService.getRecruiter(req.params.id);
 
  res.status(200).json({ success: true, recruiter });
});

/** POST /api/recruiters */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const recruiter = await recruiterService.createRecruiter(
    req.body as CreateRecruiterInput,
    req.user!.sub
  );
  res.status(201).json({ success: true, recruiter });
});

/** PATCH /api/recruiters/:id */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const recruiter = await recruiterService.updateRecruiter(
    req.params.id,
    req.body as UpdateRecruiterInput,
    req.user!.sub
  );
  res.status(200).json({ success: true, recruiter });
});

/** PATCH /api/recruiters/:id/status */
export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const recruiter = await recruiterService.setRecruiterStatus(
    req.params.id,
    (req.body as { active: boolean }).active,
    req.user!.sub
  );
  res.status(200).json({ success: true, recruiter });
});

/** DELETE /api/recruiters/:id */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await recruiterService.deleteRecruiter(req.params.id, req.user!.sub);
  res.status(200).json({ success: true, message: 'Recruiter deleted' });
});
