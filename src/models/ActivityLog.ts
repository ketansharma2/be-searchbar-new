import { Schema, model, Types, type Document, type Model } from 'mongoose';

/**
 * Unified audit trail for both recruiter and admin actions.
 * (Consolidates the PRD's ActivityLog + RecruiterLog: a single indexed
 * collection serves both the admin "all users" view and the recruiter
 * "own logs" view without duplicated write paths.)
 */
export const ACTIVITY_TYPES = [
  // Recruiter actions
  'login',
  'logout',
  'search_candidates',
  'view_candidate',
  'resume_view',
  'resume_download',
  'update_remark',
  // Admin actions
  'add_candidate',
  'bulk_upload',
  'create_recruiter',
  'update_recruiter',
  'delete_recruiter',
  'activate_recruiter',
  'deactivate_recruiter',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface IActivityLog extends Document {
  user: Types.ObjectId;
  type: ActivityType;
  // Arbitrary structured context (search params, target ids, file names, etc.).
  details: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Common access pattern: newest-first, optionally scoped to a user/type.
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

export const ActivityLog: Model<IActivityLog> = model<IActivityLog>(
  'ActivityLog',
  activityLogSchema
);
