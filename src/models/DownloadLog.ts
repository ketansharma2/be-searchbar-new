import { Schema, model, Types, type Document, type Model } from 'mongoose';

/**
 * Ledger of resume downloads — the metering source of truth.
 * Used to enforce a recruiter's daily download limit and to report
 * "usage today" in Recruiter Management. Populated by the metered-download
 * feature; queried here so the recruiter list can show used/limit.
 */
export interface IDownloadLog extends Document {
  user: Types.ObjectId;
  candidate: Types.ObjectId;
  ip?: string;
  createdAt: Date;
}

const downloadLogSchema = new Schema<IDownloadLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidate: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Fast "downloads by this user since start-of-day" counts.
downloadLogSchema.index({ user: 1, createdAt: -1 });
// Org-wide "downloads in date range" KPI (admin dashboard analytics).
downloadLogSchema.index({ createdAt: -1 });

export const DownloadLog: Model<IDownloadLog> = model<IDownloadLog>(
  'DownloadLog',
  downloadLogSchema
);
