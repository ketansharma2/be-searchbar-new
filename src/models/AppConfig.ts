import { Schema, model, type Document, type Model } from 'mongoose';

/**
 * Application-wide configuration stored in the database.
 * Allows dynamic configuration without redeployment.
 */
export interface IAppConfig extends Document {
  key: string;
  value: unknown;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appConfigSchema = new Schema<IAppConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const AppConfig: Model<IAppConfig> = model<IAppConfig>('AppConfig', appConfigSchema);
