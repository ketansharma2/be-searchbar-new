import { Types, type PipelineStage } from 'mongoose';
import { ActivityLog, type IActivityLog, type ActivityType } from '../models/ActivityLog';
import type { Role } from '../models/User';
import { BaseRepository } from './base.repository';
import type { PaginationParams } from '../utils/pagination';

export interface ActivityLogFilter {
  user?: string;
  type?: ActivityType | { $nin: ActivityType[] } | { $in: ActivityType[] };
  from?: Date;
  to?: Date;
}

export interface ActivityLogWithActor {
  _id: Types.ObjectId;
  type: ActivityType;
  // Absent (not `{}`) in MongoDB when written empty — Mongoose's `minimize`
  // option strips empty embedded objects before persisting.
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
  actor: { _id: Types.ObjectId; name: string; email: string; role: Role };
}

class ActivityLogRepository extends BaseRepository<IActivityLog> {
  constructor() {
    super(ActivityLog);
  }

  /**
   * Paginated activity feed joined with the acting user, with an optional
   * post-join filter on the actor's role (admin vs recruiter — `actorType`).
   * One round trip via $facet for both the page of data and the total count.
   */
  async findPaginatedWithActor(
    filter: ActivityLogFilter,
    actorType: 'all' | 'admin' | 'recruiter',
    pagination: PaginationParams
  ): Promise<{ items: ActivityLogWithActor[]; total: number }> {
    const match: Record<string, unknown> = {};
    if (filter.user) match.user = new Types.ObjectId(filter.user);
    if (filter.type) match.type = filter.type;
    if (filter.from || filter.to) {
      match.createdAt = {
        ...(filter.from && { $gte: filter.from }),
        ...(filter.to && { $lte: filter.to }),
      };
    }

    const pipeline: Record<string, unknown>[] = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'actor' } },
      { $unwind: '$actor' },
    ];

    if (actorType !== 'all') {
      pipeline.push({ $match: { 'actor.role': actorType === 'admin' ? 'ADMIN' : 'RECRUITER' } });
    }

    pipeline.push({
      $facet: {
        data: [
          { $skip: pagination.skip },
          { $limit: pagination.limit },
          {
            $project: {
              type: 1,
              details: 1,
              ip: 1,
              createdAt: 1,
              'actor._id': 1,
              'actor.name': 1,
              'actor.email': 1,
              'actor.role': 1,
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [result] = await ActivityLog.aggregate<{
      data: ActivityLogWithActor[];
      totalCount: { count: number }[];
    }>(pipeline as unknown as PipelineStage[]);

    return {
      items: result?.data ?? [],
      total: result?.totalCount[0]?.count ?? 0,
    };
  }
}

export const activityLogRepository = new ActivityLogRepository();
