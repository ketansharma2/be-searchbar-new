import { BulkUploadLog, type IBulkUploadLog } from '../models/BulkUploadLog';
import { BaseRepository } from './base.repository';

class BulkUploadLogRepository extends BaseRepository<IBulkUploadLog> {
  constructor() {
    super(BulkUploadLog);
  }
}

export const bulkUploadLogRepository = new BulkUploadLogRepository();
