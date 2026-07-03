import type { FilterQuery } from 'mongoose';
import { type ICandidate } from '../models/Candidate';
import { ApiError } from '../utils/ApiError';
import { candidateRepository } from '../repositories/candidate.repository';
import { bulkUploadLogRepository } from '../repositories/bulkUploadLog.repository';
import { downloadLogRepository } from '../repositories/downloadLog.repository';
import { userRepository } from '../repositories/user.repository';
import type { Role } from '../models/User';
import { generateUniqueId } from '../utils/uniqueId';
import { logActivity } from './activityLog.service';
import { parseSpreadsheet } from '../utils/spreadsheet';
import {
  buildColumnMap,
  missingRequiredColumns,
  rowToCandidate,
} from './candidate.mapper';
import { s3Storage } from './storage/s3.storage';
import type { StorageService } from './storage/storage.service';
import {
  resolvePagination,
  buildMeta,
  type Paginated,
} from '../utils/pagination';
import type {
  CreateCandidateInput,
  SearchCandidatesQuery,
} from '../validators/candidate.validators';
import type { IBulkRowError } from '../models/BulkUploadLog';

const MAX_LOGGED_ERRORS = 500;

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/**
 * Manual add: dedupe → upload PDF → save candidate → audit log.
 * The PDF is required (enforced by the controller).
 */
export async function createCandidateManual(
  input: CreateCandidateInput,
  file: UploadedFile,
  actorId: string,
  storage: StorageService = s3Storage
): Promise<ICandidate> {
  const existing = await candidateRepository.findDuplicate({
    email: input.email,
    mobile: input.mobile,
  });
  if (existing) {
    throw new ApiError(409, 'A candidate with this email or mobile already exists');
  }

  const uploaded = await storage.upload({
    buffer: file.buffer,
    contentType: file.mimetype || 'application/pdf',
    keyPrefix: 'resumes',
    filename: file.originalname,
  });

  const candidate = await candidateRepository.create({
    unique_id: generateUniqueId(),
    name: input.name,
    email: input.email,
    mobile: input.mobile,
    gender: input.gender,
    location: input.location,
    qualification: input.qualification,
    designation: input.designation,
    recentCompany: input.recentCompany,
    experience: input.experience,
    relevantExp: input.relevantExp,
    portal: input.portal,
    portalDate: input.portalDate,
    applyDate: input.applyDate,
    callingDate: input.callingDate,
    currCTC: input.currCTC,
    expCTC: input.expCTC,
    feedback: input.feedback,
    jdBrief: input.jdBrief,
    topSkills: input.topSkills,
    skillsAll: input.skillsAll,
    companyNamesAll: input.companyNamesAll,
    education: input.education,
    resumeUrl: input.resumeUrl || uploaded.url,
    pdfFile: uploaded.key,
    createdBy: actorId as never,
  });

  await logActivity({
    userId: actorId,
    type: 'add_candidate',
    details: { candidateId: candidate.id, source: 'manual', name: candidate.name },
  });

  return candidate;
}

export interface BulkUploadSummary {
  fileName: string;
  total: number;
  success: number;
  failed: number;
  errors: IBulkRowError[];
}

/**
 * Bulk upload: parse sheet → validate required columns → per-row
 * validate/dedupe/insert (one bad row never fails the batch) → write
 * BulkUploadLog + audit log → return summary.
 */
export async function bulkUploadCandidates(
  buffer: Buffer,
  fileName: string,
  actorId: string
): Promise<BulkUploadSummary> {
  const { headers, rows } = await parseSpreadsheet(buffer, fileName);

  const columnMap = buildColumnMap(headers);
  const missing = missingRequiredColumns(columnMap);
  if (missing.length > 0) {
    throw ApiError.badRequest('Missing required columns', {
      missingColumns: missing,
      detectedColumns: headers,
    });
  }

  const errors: IBulkRowError[] = [];
  let success = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const rowNumber = i + 2; // header is row 1
    const mapped = rowToCandidate(rows[i], columnMap);

    // Row-level required for insert: name + resumeUrl (unique_id auto-generated).
    if (!mapped.name || !mapped.resumeUrl) {
      errors.push({
        row: rowNumber,
        email: mapped.email,
        reason: !mapped.name ? 'Missing name' : 'Missing resume URL',
      });
      continue;
    }

    try {
      const duplicate = await candidateRepository.findDuplicate({
        unique_id: mapped.unique_id,
        email: mapped.email,
        mobile: mapped.mobile,
      });
      if (duplicate) {
        errors.push({ row: rowNumber, email: mapped.email, reason: 'Duplicate candidate' });
        continue;
      }

      await candidateRepository.create({
        ...mapped,
        unique_id: mapped.unique_id || generateUniqueId(),
        createdBy: actorId as never,
      });
      success += 1;
    } catch (err) {
      errors.push({
        row: rowNumber,
        email: mapped.email,
        reason: err instanceof Error ? err.message : 'Insert failed',
      });
    }
  }

  const failed = rows.length - success;

  await bulkUploadLogRepository.create({
    uploadedBy: actorId as never,
    fileName,
    totalRows: rows.length,
    successRows: success,
    failedRows: failed,
    rowErrors: errors.slice(0, MAX_LOGGED_ERRORS),
  });

  await logActivity({
    userId: actorId,
    type: 'bulk_upload',
    details: { fileName, total: rows.length, success, failed },
  });

  return { fileName, total: rows.length, success, failed, errors };
}

export async function getCandidateById(id: string): Promise<ICandidate> {
  const candidate = await candidateRepository.findById(id);
  if (!candidate) {
    throw ApiError.notFound('Candidate not found');
  }
  return candidate;
}

// ── Search ────────────────────────────────────────────────────────────────

export interface CandidateCard {
  id: string;
  unique_id: string;
  name: string;
  designation?: string;
  experience?: string;
  relevantExp?: number;
  recentCompany?: string;
  location?: string;
  topSkills: string[];
  hasResume: boolean;
}

function toCard(c: ICandidate): CandidateCard {
  return {
    id: c.id,
    unique_id: c.unique_id,
    name: c.name,
    designation: c.designation,
    experience: c.experience,
    relevantExp: c.relevantExp,
    recentCompany: c.recentCompany,
    location: c.location,
    topSkills: c.topSkills ?? [],
    hasResume: Boolean(c.resumeUrl || c.pdfFile),
  };
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ci(value: string): RegExp {
  return new RegExp(escapeRegex(value), 'i');
}

function ciExact(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value)}$`, 'i');
}

/**
 * Hybrid candidate search (recruiter + admin). Requires ≥1 criterion.
 * Every executed search is written to the activity log with its parameters.
 */
export async function searchCandidates(
  query: SearchCandidatesQuery,
  actorId: string
): Promise<Paginated<CandidateCard>> {
  const q = query.q?.trim() || undefined;
  const hasCriterion =
    Boolean(q) ||
    Boolean(query.location) ||
    Boolean(query.designation) ||
    query.minExp !== undefined ||
    query.maxExp !== undefined ||
    (query.skills?.length ?? 0) > 0 ||
    (query.keywords?.length ?? 0) > 0;

  if (!hasCriterion) {
    throw ApiError.badRequest('Please provide at least one search criterion');
  }

  const filter: FilterQuery<ICandidate> = {};
  if (query.location) filter.location = ci(query.location);
  if (query.designation) filter.designation = ci(query.designation);

  if (query.minExp !== undefined || query.maxExp !== undefined) {
    filter.relevantExp = {};
    if (query.minExp !== undefined) filter.relevantExp.$gte = query.minExp;
    if (query.maxExp !== undefined) filter.relevantExp.$lte = query.maxExp;
  }

  const and: FilterQuery<ICandidate>[] = [];
  // Skills: AND-match across topSkills ∪ skillsAll.
  for (const skill of query.skills ?? []) {
    and.push({ $or: [{ topSkills: ciExact(skill) }, { skillsAll: ciExact(skill) }] });
  }
  // Resume keywords: match extracted keywords/text (populated once extraction lands).
  for (const kw of query.keywords ?? []) {
    and.push({ $or: [{ resumeKeywords: ci(kw) }, { resumeText: ci(kw) }] });
  }
  if (and.length > 0) filter.$and = and;

  const pagination = resolvePagination(query.page, query.limit ?? 20);
  const { items, total } = await candidateRepository.search(filter, q, pagination);

  await logActivity({
    userId: actorId,
    type: 'search_candidates',
    details: {
      q,
      location: query.location,
      designation: query.designation,
      minExp: query.minExp,
      maxExp: query.maxExp,
      skills: query.skills,
      keywords: query.keywords,
      resultCount: total,
    },
  });

  return { data: items.map(toCard), pagination: buildMeta(total, pagination) };
}

// ── Remarks ─────────────────────────────────────────────────────────────

// ── Metered resume access ─────────────────────────────────────────────────

export interface ResumeUsage {
  unlimited: boolean;
  usedToday?: number;
  dailyDownloadLimit?: number;
  remaining?: number;
}

function resumeUrlOf(c: ICandidate): string {
  const url = c.resumeUrl;
  if (!url) throw ApiError.notFound('Resume not available for this candidate');
  return url;
}

/**
 * Resume preview — returns the URL WITHOUT consuming quota.
 * Logged as a lightweight `resume_view` action.
 */
export async function previewResume(
  id: string,
  actorId: string
): Promise<{ url: string }> {
  const candidate = await candidateRepository.findById(id);
  if (!candidate) throw ApiError.notFound('Candidate not found');
  const url = resumeUrlOf(candidate);

  await logActivity({ userId: actorId, type: 'resume_view', details: { candidateId: id } });
  return { url };
}

/**
 * Resume download — metered. For recruiters the daily limit is enforced
 * (403 when reached); admins are unlimited. Records a DownloadLog +
 * `resume_download` activity entry.
 */
export async function downloadResume(
  id: string,
  actor: { id: string; role: Role },
  ip?: string
): Promise<{ url: string; usage: ResumeUsage }> {
  const candidate = await candidateRepository.findById(id);
  if (!candidate) throw ApiError.notFound('Candidate not found');
  const url = resumeUrlOf(candidate);

  let usage: ResumeUsage = { unlimited: true };

  if (actor.role === 'RECRUITER') {
    const user = await userRepository.findById(actor.id);
    if (!user) throw ApiError.unauthorized('User no longer exists');
    const limit = user.dailyDownloadLimit;
    const usedToday = await downloadLogRepository.countToday(actor.id);
    if (usedToday >= limit) {
      throw new ApiError(403, 'Daily download limit exceeded');
    }
    const newUsed = usedToday + 1;
    usage = {
      unlimited: false,
      usedToday: newUsed,
      dailyDownloadLimit: limit,
      remaining: Math.max(0, limit - newUsed),
    };
  }

  await downloadLogRepository.create({
    user: actor.id as never,
    candidate: id as never,
    ip,
  });
  await logActivity({
    userId: actor.id,
    type: 'resume_download',
    details: { candidateId: id },
    ip,
  });

  return { url, usage };
}

export async function addRemark(
  id: string,
  text: string,
  actor: { id: string; name?: string; email?: string }
): Promise<ICandidate> {
  const exists = await candidateRepository.findById(id);
  if (!exists) throw ApiError.notFound('Candidate not found');

  const updated = await candidateRepository.addRemark(id, {
    text,
    author: actor.id as never,
    authorName: actor.name,
    authorEmail: actor.email,
    createdAt: new Date(),
  } as never);

  await logActivity({
    userId: actor.id,
    type: 'update_remark',
    details: { candidateId: id },
  });

  return updated as ICandidate;
}
