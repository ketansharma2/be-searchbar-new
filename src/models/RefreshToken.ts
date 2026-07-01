import { Schema, model, Types, type Document, type Model } from 'mongoose';

export interface IRefreshToken extends Document {
  user: Types.ObjectId;
  // SHA-256 hash of the raw JWT refresh token — never store the raw token.
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index — Mongo automatically purges expired token documents.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<IRefreshToken> = model<IRefreshToken>(
  'RefreshToken',
  refreshTokenSchema
);
