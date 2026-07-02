import { ActivityLog, type IActivityLog } from '../models/ActivityLog';
import { BaseRepository } from './base.repository';

class ActivityLogRepository extends BaseRepository<IActivityLog> {
  constructor() {
    super(ActivityLog);
  }
}

export const activityLogRepository = new ActivityLogRepository();
