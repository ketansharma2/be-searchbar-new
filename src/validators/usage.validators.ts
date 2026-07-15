import { z } from 'zod';

const dateRangeIsOrdered = (data: { from?: Date; to?: Date }) =>
  !data.from || !data.to || data.from <= data.to;

/** Both bounds optional — omitting either falls back to the existing today-only behavior. */
export const usageRangeSchema = z.object({
  query: z
    .object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    })
    .refine(dateRangeIsOrdered, { message: '`from` must not be after `to`', path: ['from'] }),
});

export type UsageRangeQuery = z.infer<typeof usageRangeSchema>['query'];
