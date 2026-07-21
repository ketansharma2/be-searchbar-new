import { z } from 'zod';

/**
 * Accept an array either as a real array, a JSON string, or a comma/semicolon
 * separated string (multipart form fields arrive as strings).
 */
const stringArray = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return [];
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
      } catch {
        /* fall through to delimiter split */
      }
    }
    return trimmed
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string()));

const educationArray = z.preprocess((val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}, z.array(
  z.object({
    degree: z.string().trim().optional(),
    institute: z.string().trim().optional(),
    passingYear: z.string().trim().optional(),
    score: z.string().trim().optional(),
  })
));

const optionalNumber = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : v),
  z.coerce.number().optional()
);

const optionalDate = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : v),
  z.coerce.date().optional()
);

export const createCandidateSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required'),
    email: z.string({ required_error: 'Email is required' }).email('Enter a valid email').trim(),
    mobile: z
      .string({ required_error: 'Mobile is required' })
      .trim()
      .regex(/^\d{10}$/, 'Mobile must be 10 digits'),
    location: z.string({ required_error: 'Location is required' }).trim().min(1, 'Location is required'),
    qualification: z
      .string({ required_error: 'Qualification is required' })
      .trim()
      .min(1, 'Qualification is required'),
    designation: z
      .string({ required_error: 'Designation is required' })
      .trim()
      .min(1, 'Designation is required'),

    gender: z.string().trim().optional(),
    resumeUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
    portal: z.string().trim().optional(),
    portalDate: optionalDate,
    experience: z.string().trim().optional(),
    relevantExp: optionalNumber,
    recentCompany: z.string().trim().optional(),
    applyDate: optionalDate,
    callingDate: optionalDate,
    currCTC: optionalNumber,
    expCTC: optionalNumber,
    feedback: z.string().trim().optional(),
    jdBrief: z.string().trim().optional(),

    topSkills: stringArray,
    skillsAll: stringArray,
    companyNamesAll: stringArray,
    education: educationArray,
  }),
});

export const candidateIdSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') }),
});

/** Accept a query array as repeated params, a JSON array, or a delimited string. */
const queryStringArray = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return [];
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
  if (typeof val === 'string') {
    const t = val.trim();
    if (t.startsWith('[')) {
      try {
        const p = JSON.parse(t);
        if (Array.isArray(p)) return p.map((v) => String(v).trim()).filter(Boolean);
      } catch {
        /* fall through */
      }
    }
    return t.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}, z.array(z.string()));

const optionalNum = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : v),
  z.coerce.number().optional()
);

export const searchCandidatesSchema = z.object({
  query: z.object({
    q: z.string().trim().optional(),
    location: z.string().trim().optional(),
    designation: z.string().trim().optional(),
    experience: z.string().optional(),
    skills: queryStringArray,
    keywords: queryStringArray,
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const addRemarkSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') }),
  body: z.object({
    text: z.string({ required_error: 'Remark is required' }).trim().min(1, 'Remark cannot be empty'),
  }),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>['body'];
export type SearchCandidatesQuery = z.infer<typeof searchCandidatesSchema>['query'];
