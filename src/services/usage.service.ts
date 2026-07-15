import { downloadLogRepository } from '../repositories/downloadLog.repository';
import { userRepository } from '../repositories/user.repository';
import { ApiError } from '../utils/ApiError';
import { buildRangeSummary, type RangeSummary } from '../utils/dateRange';
import type { Role } from '../models/User';

export interface MyUsage {
  unlimited: boolean;
  usedToday: number;
  dailyDownloadLimit?: number;
  remaining?: number;
  /** Present only when a [from, to] range was requested — downloads in that window, self-scoped. */
  range?: RangeSummary;
}

/** The requesting user's own download usage for today (+ optional range breakdown). */
export async function getMyUsage(userId: string, role: Role, from?: Date, to?: Date): Promise<MyUsage> {
  const [usedToday, range] = await Promise.all([
    downloadLogRepository.countToday(userId),
    from && to ? downloadLogRepository.getRangeSummary(from, to, userId) : Promise.resolve(null),
  ]);
  const rangeSummary =
    range && from && to ? buildRangeSummary(from, to, range.count, range.previousCount) : undefined;

  if (role === 'ADMIN') {
    return { unlimited: true, usedToday, ...(rangeSummary ? { range: rangeSummary } : {}) };
  }
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  const limit = user.dailyDownloadLimit;
  return {
    unlimited: false,
    usedToday,
    dailyDownloadLimit: limit,
    remaining: Math.max(0, limit - usedToday),
    ...(rangeSummary ? { range: rangeSummary } : {}),
  };
}

export interface GlobalUsage {
  totalDownloadsToday: number;
  activeRecruiters: number;
  /** Present only when a [from, to] range was requested — org-wide downloads in that window. */
  range?: RangeSummary;
}

/** Organisation-wide usage snapshot (admin), + optional range breakdown. */
export async function getGlobalUsage(from?: Date, to?: Date): Promise<GlobalUsage> {
  const [totalDownloadsToday, activeRecruiters, range] = await Promise.all([
    downloadLogRepository.countAllToday(),
    userRepository.count({ role: 'RECRUITER', active: true }),
    from && to ? downloadLogRepository.getRangeSummary(from, to) : Promise.resolve(null),
  ]);
  return {
    totalDownloadsToday,
    activeRecruiters,
    ...(range && from && to
      ? { range: buildRangeSummary(from, to, range.count, range.previousCount) }
      : {}),
  };
}
