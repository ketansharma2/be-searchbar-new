import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import * as candidateService from '../services/candidate.service';
import type {
  CreateCandidateInput,
  SearchCandidatesQuery,
} from '../validators/candidate.validators';

/** POST /api/candidates  (multipart: fields + required `resume` PDF) */
export const createManual = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest('Validation failed', { resume: ['A PDF resume is required'] });
  }
  const candidate = await candidateService.createCandidateManual(
    req.body as CreateCandidateInput,
    {
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    },
    req.user!.sub
  );
  res.status(201).json({ success: true, candidate });
});

/** POST /api/candidates/bulk  (multipart: `file` .xlsx/.csv) */
export const bulkUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest('Validation failed', { file: ['A spreadsheet file is required'] });
  }
  const summary = await candidateService.bulkUploadCandidates(
    req.file.buffer,
    req.file.originalname,
    req.user!.sub
  );
  res.status(200).json({ success: true, summary });
});

/** GET /api/candidates  (hybrid search + filters; recruiter + admin) */
export const search = asyncHandler(async (req: Request, res: Response) => {
  const query = req.validated?.query as SearchCandidatesQuery;
  const result = await candidateService.searchCandidates(query, req.user!.sub);
  res.status(200).json({ success: true, ...result });
});

/** GET /api/candidates/:id */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const candidate = await candidateService.getCandidateById(req.params.id);
  res.status(200).json({ success: true, candidate });
});

/** GET /api/candidates/locations (unique locations for suggestions) */
export const getUniqueLocations = asyncHandler(async (req: Request, res: Response) => {
  const locations = await candidateService.getUniqueLocations();
  res.status(200).json({ success: true, locations });
});

/** GET /api/candidates/skills (unique skills for suggestions) */
export const getUniqueSkills = asyncHandler(async (req: Request, res: Response) => {
  const skills = await candidateService.getUniqueSkills();
  res.status(200).json({ success: true, skills });
});
/** GET /api/candidates/:id/resume/preview  (no quota; recruiter + admin) */
export const previewResume = asyncHandler(async (req: Request, res: Response) => {
  const result = await candidateService.previewResume(req.params.id, req.user!.sub);
  res.status(200).json({ success: true, ...result });
});

/** GET /api/candidates/:id/resume/download  (metered; recruiter + admin) */
export const downloadResume = asyncHandler(async (req: Request, res: Response) => {
  const result = await candidateService.downloadResume(
    req.params.id,
    { id: req.user!.sub, role: req.user!.role },
    req.ip
  );
  res.status(200).json({ success: true, ...result });
});

/** POST /api/candidates/:id/remarks  (recruiter + admin) */
export const addRemark = asyncHandler(async (req: Request, res: Response) => {
  const candidate = await candidateService.addRemark(
    req.params.id,
    (req.body as { text: string }).text,
    { id: req.user!.sub, name: req.user!.name, email: req.user!.email }
  );
  res.status(201).json({ success: true, candidate });
});
