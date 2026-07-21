import mongoose, { Schema, Document } from 'mongoose';

export interface ISkill extends Document {
  name: string;
  category?: string;
  isActive: boolean;
}

const skillSchema = new Schema<ISkill>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

skillSchema.index({ name: 1 });

export const Skill = mongoose.model<ISkill>('Skill', skillSchema);