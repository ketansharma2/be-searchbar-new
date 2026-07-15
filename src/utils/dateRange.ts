import type { Model, FilterQuery } from 'mongoose';

/** Local midnight for the given date (defaults to now). */
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Local midnight `n` days before today (0 = today). */
export function daysAgo(n: number): Date {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
}

/** The equal-length window immediately preceding [from, to] — for period-over-period trends. */
export function previousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { from: prevFrom, to: prevTo };
}

/** Percent change, rounded to one decimal. `null` when the previous value was 0 (undefined/infinite growth). */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Counts documents matching `baseFilter` within [from, to] on `dateField`, and
 * within the equal-length prior window, in a single aggregation round trip —
 * the shared shape behind every "X added in range, vs. previous period" KPI.
 */
export async function countCurrentAndPrevious<T>(
  model: Model<T>,
  baseFilter: FilterQuery<T>,
  dateField: string,
  from: Date,
  to: Date
): Promise<{ count: number; previousCount: number }> {
  const prev = previousPeriod(from, to);
  const [result] = await model.aggregate<{
    current: { count: number }[];
    previous: { count: number }[];
  }>([
    { $match: baseFilter },
    {
      $facet: {
        current: [{ $match: { [dateField]: { $gte: from, $lte: to } } }, { $count: 'count' }],
        previous: [
          { $match: { [dateField]: { $gte: prev.from, $lte: prev.to } } },
          { $count: 'count' },
        ],
      },
    },
  ]);
  return {
    count: result?.current[0]?.count ?? 0,
    previousCount: result?.previous[0]?.count ?? 0,
  };
}

export interface RangeSummary {
  from: string;
  to: string;
  count: number;
  previousCount: number;
  deltaPct: number | null;
}

/** Builds the standard `range` sub-object shared by every range-filterable KPI endpoint. */
export function buildRangeSummary(from: Date, to: Date, count: number, previousCount: number): RangeSummary {
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    count,
    previousCount,
    deltaPct: deltaPct(count, previousCount),
  };
}
