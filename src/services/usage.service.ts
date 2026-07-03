import { downloadLogRepository } from '../repositories/downloadLog.repository';
import { userRepository } from '../repositories/user.repository';
import { ApiError } from '../utils/ApiError';
import type { Role } from '../models/User';

export interface MyUsage {
  unlimited: boolean;
  usedToday: number;
  dailyDownloadLimit?: number;
  remaining?: number;
}

/** The requesting user's own download usage for today. */
export async function getMyUsage(userId: string, role: Role): Promise<MyUsage> {
  const usedToday = await downloadLogRepository.countToday(userId);
  if (role === 'ADMIN') {
    return { unlimited: true, usedToday };
  }
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  const limit = user.dailyDownloadLimit;
  return {
    unlimited: false,
    usedToday,
    dailyDownloadLimit: limit,
    remaining: Math.max(0, limit - usedToday),
  };
}

export interface GlobalUsage {
  totalDownloadsToday: number;
  activeRecruiters: number;
}

/** Organisation-wide usage snapshot (admin). */
export async function getGlobalUsage(): Promise<GlobalUsage> {
  const [totalDownloadsToday, activeRecruiters] = await Promise.all([
    downloadLogRepository.countAllToday(),
    userRepository.count({ role: 'RECRUITER', active: true }),
  ]);
  return { totalDownloadsToday, activeRecruiters };
}
