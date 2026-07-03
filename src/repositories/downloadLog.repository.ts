import { Types } from 'mongoose';
import { DownloadLog, type IDownloadLog } from '../models/DownloadLog';
import { BaseRepository } from './base.repository';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

class DownloadLogRepository extends BaseRepository<IDownloadLog> {
  constructor() {
    super(DownloadLog);
  }

  /** Number of downloads a user has made since local start-of-day. */
  countToday(userId: string): Promise<number> {
    return this.count({
      user: new Types.ObjectId(userId),
      createdAt: { $gte: startOfToday() },
    });
  }

  /** Total downloads across all users since local start-of-day. */
  countAllToday(): Promise<number> {
    return this.count({ createdAt: { $gte: startOfToday() } });
  }

  /** Today's download counts for many users at once → { userId: count }. */
  async countTodayForUsers(userIds: string[]): Promise<Record<string, number>> {
    if (userIds.length === 0) return {};
    const rows = await DownloadLog.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          user: { $in: userIds.map((id) => new Types.ObjectId(id)) },
          createdAt: { $gte: startOfToday() },
        },
      },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]);
    const map: Record<string, number> = {};
    for (const row of rows) map[row._id.toString()] = row.count;
    return map;
  }
}

export const downloadLogRepository = new DownloadLogRepository();
