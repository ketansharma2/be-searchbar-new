import type { PipelineStage } from 'mongoose';
import { Candidate } from '../models/Candidate';
import {
  startOfDay,
  daysAgo,
  countCurrentAndPrevious,
  buildRangeSummary,
  type RangeSummary,
} from '../utils/dateRange';

export type AnalyticsDimension =
  | 'location'
  | 'skills'
  | 'designation'
  | 'company'
  | 'portal'
  | 'experience';

export interface AnalyticsSummary {
  totalCandidates: number;
  addedToday: number;
  addedYesterday: number;
  addedThisWeek: number;
  /** Present only when a [from, to] range was requested. */
  range?: RangeSummary;
}

/** `[]` when no range was requested, else a single $match stage on `createdAt`. */
function dateRangeMatchStage(from?: Date, to?: Date): Record<string, unknown>[] {
  return from && to ? [{ $match: { createdAt: { $gte: from, $lte: to } } }] : [];
}

export interface BreakdownRow {
  label: string;
  count: number;
}

const BREAKDOWN_LIMIT = 200;
const EXPERIENCE_BOUNDARIES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Collapses a location value to its primary city: trim, first comma-part,
 * first pipe-part, trim. Pass `lowercase: true` for the grouping key (so
 * "Bangalore" and "bangalore, karnataka" merge) and `false` for the display
 * label (so the collapsed value keeps its original casing, e.g. "Bangalore"
 * rather than the full raw "Bangalore, Karnataka").
 */
function primaryLocationExpr(fieldPath: string, lowercase: boolean): Record<string, unknown> {
  const base = lowercase
    ? { $toLower: { $ifNull: [fieldPath, ''] } }
    : { $ifNull: [fieldPath, ''] };
  return {
    $trim: {
      input: {
        $arrayElemAt: [
          {
            $split: [
              { $arrayElemAt: [{ $split: [{ $trim: { input: base } }, ','] }, 0] },
              '|',
            ],
          },
          0,
        ],
      },
    },
  };
}

/** Mirrors primaryLocationExpr's (lowercased) algorithm in plain JS, for the `location` query param. */
export function normalizeLocationInput(value: string): string {
  const lower = value.toLowerCase().trim();
  const commaPart = lower.split(',')[0] ?? lower;
  return (commaPart.split('|')[0] ?? commaPart).trim();
}

/** Group-by-key + count, keeping one sample expression for display, sorted desc, capped. */
function groupPipeline(idExpr: unknown, sampleExpr: unknown): Record<string, unknown>[] {
  return [
    { $group: { _id: idExpr, count: { $sum: 1 }, sampleLabel: { $first: sampleExpr } } },
    { $match: { _id: { $ne: '' } } },
    { $project: { _id: 0, label: '$sampleLabel', count: 1 } },
    { $sort: { count: -1 } },
    { $limit: BREAKDOWN_LIMIT },
  ];
}

class AnalyticsRepository {
  async getSummary(from?: Date, to?: Date): Promise<AnalyticsSummary> {
    const today = startOfDay();
    const yesterday = daysAgo(1);
    const weekAgo = daysAgo(7);

    const [[result], range] = await Promise.all([
      Candidate.aggregate<{
        total: { count: number }[];
        today: { count: number }[];
        yesterday: { count: number }[];
        last7Days: { count: number }[];
      }>([
        {
          $facet: {
            total: [{ $count: 'count' }],
            today: [{ $match: { createdAt: { $gte: today } } }, { $count: 'count' }],
            yesterday: [
              { $match: { createdAt: { $gte: yesterday, $lt: today } } },
              { $count: 'count' },
            ],
            last7Days: [{ $match: { createdAt: { $gte: weekAgo } } }, { $count: 'count' }],
          },
        },
      ]),
      from && to ? countCurrentAndPrevious(Candidate, {}, 'createdAt', from, to) : Promise.resolve(null),
    ]);

    return {
      totalCandidates: result?.total[0]?.count ?? 0,
      addedToday: result?.today[0]?.count ?? 0,
      addedYesterday: result?.yesterday[0]?.count ?? 0,
      addedThisWeek: result?.last7Days[0]?.count ?? 0,
      ...(range && from && to
        ? { range: buildRangeSummary(from, to, range.count, range.previousCount) }
        : {}),
    };
  }

  async getBreakdown(
    dimension: AnalyticsDimension,
    location?: string,
    from?: Date,
    to?: Date
  ): Promise<BreakdownRow[]> {
    const dateMatch = dateRangeMatchStage(from, to);

    switch (dimension) {
      case 'location':
        return this.aggregate([
          ...dateMatch,
          { $match: { location: { $type: 'string', $ne: '' } } },
          ...groupPipeline(
            primaryLocationExpr('$location', true),
            primaryLocationExpr('$location', false)
          ),
        ]);

      case 'skills':
        return this.aggregate([
          ...dateMatch,
          {
            $addFields: {
              _value: { $setUnion: [{ $ifNull: ['$topSkills', []] }, { $ifNull: ['$skillsAll', []] }] },
            },
          },
          { $unwind: '$_value' },
          { $match: { _value: { $type: 'string', $ne: '' } } },
          ...groupPipeline({ $trim: { input: { $toLower: '$_value' } } }, '$_value'),
        ]);

      case 'company':
        return this.aggregate([
          ...dateMatch,
          {
            $addFields: {
              _value: {
                $setUnion: [
                  { $ifNull: ['$companyNamesAll', []] },
                  {
                    $cond: [
                      { $and: [{ $ne: ['$recentCompany', null] }, { $ne: ['$recentCompany', ''] }] },
                      ['$recentCompany'],
                      [],
                    ],
                  },
                ],
              },
            },
          },
          { $unwind: '$_value' },
          { $match: { _value: { $type: 'string', $ne: '' } } },
          ...groupPipeline({ $trim: { input: { $toLower: '$_value' } } }, '$_value'),
        ]);

      case 'designation': {
        const pipeline: Record<string, unknown>[] = [...dateMatch];
        if (location) {
          pipeline.push({ $addFields: { _normLocation: primaryLocationExpr('$location', true) } });
          pipeline.push({ $match: { _normLocation: normalizeLocationInput(location) } });
        }
        pipeline.push({ $match: { designation: { $type: 'string', $ne: '' } } });
        pipeline.push(
          ...groupPipeline({ $trim: { input: { $toLower: '$designation' } } }, '$designation')
        );
        return this.aggregate(pipeline);
      }

      case 'portal':
        return this.aggregate([
          ...dateMatch,
          { $match: { portal: { $type: 'string', $ne: '' } } },
          ...groupPipeline({ $trim: { input: { $toLower: '$portal' } } }, '$portal'),
        ]);

      case 'experience':
        return this.getExperienceBreakdown(from, to);
    }
  }

  private async aggregate(pipeline: Record<string, unknown>[]): Promise<BreakdownRow[]> {
    return Candidate.aggregate<BreakdownRow>(pipeline as unknown as PipelineStage[]);
  }

  /** Whole-year buckets, sorted ascending by year (the one dimension not sorted by count). */
  private async getExperienceBreakdown(from?: Date, to?: Date): Promise<BreakdownRow[]> {
    const dateFilter = from && to ? { createdAt: { $gte: from, $lte: to } } : {};

    const [buckets, unknownCount] = await Promise.all([
      Candidate.aggregate<{ _id: number; count: number }>([
        { $match: { ...dateFilter, relevantExp: { $type: 'number' } } },
        {
          $bucket: {
            groupBy: '$relevantExp',
            boundaries: EXPERIENCE_BOUNDARIES,
            default: 10,
            output: { count: { $sum: 1 } },
          },
        },
      ]),
      Candidate.countDocuments({ ...dateFilter, relevantExp: { $not: { $type: 'number' } } }),
    ]);

    const rows: BreakdownRow[] = EXPERIENCE_BOUNDARIES.slice(0, -1).map((year) => {
      const bucket = buckets.find((b) => b._id === year);
      return { label: `${year} year${year === 1 ? '' : 's'}`, count: bucket?.count ?? 0 };
    });
    const overflow = buckets.find((b) => b._id === 10);
    rows.push({ label: '10+ years', count: overflow?.count ?? 0 });
    if (unknownCount > 0) rows.push({ label: 'Unknown', count: unknownCount });
    return rows;
  }
}

export const analyticsRepository = new AnalyticsRepository();
