import { Schema, model, Types, type Document, type Model } from 'mongoose';

export interface IBulkRowError {
  row: number; // 1-based row number in the sheet (excluding header)
  email?: string;
  reason: string;
}

export interface IBulkUploadLog extends Document {
  uploadedBy: Types.ObjectId;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  // Named `rowErrors` (not `errors`) to avoid clashing with Mongoose
  // Document's built-in `errors` validation property.
  rowErrors: IBulkRowError[];
  createdAt: Date;
}

const bulkRowErrorSchema = new Schema<IBulkRowError>(
  {
    row: { type: Number, required: true },
    email: { type: String },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const bulkUploadLogSchema = new Schema<IBulkUploadLog>(
  {
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    totalRows: { type: Number, required: true, default: 0 },
    successRows: { type: Number, required: true, default: 0 },
    failedRows: { type: Number, required: true, default: 0 },
    rowErrors: { type: [bulkRowErrorSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

bulkUploadLogSchema.index({ createdAt: -1 });

export const BulkUploadLog: Model<IBulkUploadLog> = model<IBulkUploadLog>(
  'BulkUploadLog',
  bulkUploadLogSchema
);
