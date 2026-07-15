import { z } from 'zod';
import { ACTIVITY_TYPES } from '../models/ActivityLog';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const listActivityLogsSchema = z.object({
  query: z
    .object({
      userId: objectId.optional(),
      actorType: z.enum(['all', 'admin', 'recruiter']).optional().default('all'),
      type: z.enum(ACTIVITY_TYPES).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    })
    .refine((data) => !data.from || !data.to || data.from <= data.to, {
      message: '`from` must not be after `to`',
      path: ['from'],
    }),
});

export type ListActivityLogsQuery = z.infer<typeof listActivityLogsSchema>['query'];
