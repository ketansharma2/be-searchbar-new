import { z } from 'zod';

export const ANALYTICS_DIMENSIONS = [
  'location',
  'skills',
  'designation',
  'company',
  'portal',
  'experience',
] as const;

const dateRangeIsOrdered = (data: { from?: Date; to?: Date }) =>
  !data.from || !data.to || data.from <= data.to;

export const analyticsSummarySchema = z.object({
  query: z
    .object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    })
    .refine(dateRangeIsOrdered, { message: '`from` must not be after `to`', path: ['from'] }),
});

export const analyticsBreakdownSchema = z.object({
  query: z
    .object({
      dimension: z.enum(ANALYTICS_DIMENSIONS),
      location: z.string().trim().min(1).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    })
    .refine(dateRangeIsOrdered, { message: '`from` must not be after `to`', path: ['from'] }),
});

export type AnalyticsSummaryQuery = z.infer<typeof analyticsSummarySchema>['query'];
export type AnalyticsBreakdownQuery = z.infer<typeof analyticsBreakdownSchema>['query'];
