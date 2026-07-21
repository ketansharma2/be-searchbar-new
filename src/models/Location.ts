import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  city: string;
  state: string;
  isActive: boolean;
}

const locationSchema = new Schema<ILocation>({
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

locationSchema.index({ city: 1, state: 1 }, { unique: true });

export const Location = mongoose.model<ILocation>('Location', locationSchema);