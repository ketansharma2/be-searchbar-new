import { activityLogRepository } from '../repositories/activityLog.repository';
import type { ActivityType } from '../models/ActivityLog';

/**
 * Append an audit entry. Logging must never break the primary action, so
 * failures here are swallowed (and reported to the console) rather than thrown.
 */
export async function logActivity(params: {
  userId: string;
  type: ActivityType;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await activityLogRepository.create({
      user: params.userId as never,
      type: params.type,
      details: params.details ?? {},
      ip: params.ip,
    });
  } catch (err) {
    console.error('[activityLog] failed to record', params.type, err);
  }
}
