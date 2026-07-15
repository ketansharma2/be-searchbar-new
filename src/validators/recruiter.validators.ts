import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const listRecruitersSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const recruiterIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const createRecruiterSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required'),
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please enter a valid email')
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters'),
    dailyDownloadLimit: z.coerce
      .number({ invalid_type_error: 'Daily limit must be a number' })
      .int('Daily limit must be a whole number')
      .min(0, 'Daily limit cannot be negative')
      .optional()
      .default(10),
    active: z.boolean().optional().default(true),
  }),
});

export const updateRecruiterSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(1, 'Name is required').optional(),
      email: z.string().email('Please enter a valid email').toLowerCase().trim().optional(),
      // Blank password means "leave unchanged" — handled in the service.
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .optional()
        .or(z.literal('')),
      dailyDownloadLimit: z.coerce
        .number()
        .int('Daily limit must be a whole number')
        .min(0, 'Daily limit cannot be negative')
        .optional(),
      active: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'No fields provided to update',
    }),
});

export const setStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    active: z.boolean({ required_error: 'active is required' }),
  }),
});

/** Dashboard "Recruiters added in range" KPI — a range is the whole point, so both bounds are required. */
export const recruiterSummarySchema = z.object({
  query: z
    .object({
      from: z.coerce.date({ required_error: '`from` is required' }),
      to: z.coerce.date({ required_error: '`to` is required' }),
    })
    .refine((data) => data.from <= data.to, {
      message: '`from` must not be after `to`',
      path: ['from'],
    }),
});

export type CreateRecruiterInput = z.infer<typeof createRecruiterSchema>['body'];
export type UpdateRecruiterInput = z.infer<typeof updateRecruiterSchema>['body'];
export type ListRecruitersQuery = z.infer<typeof listRecruitersSchema>['query'];
export type RecruiterSummaryQuery = z.infer<typeof recruiterSummarySchema>['query'];
