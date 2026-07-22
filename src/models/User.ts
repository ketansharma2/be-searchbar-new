import { Schema, model, type Document, type Model } from 'mongoose';
import { comparePassword } from '../utils/password';

export type Role = 'ADMIN' | 'RECRUITER';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  real_password:string;
  role: Role;
  active: boolean;
  /** Daily resume-download quota (recruiter concept; ignored for admins). */
  dailyDownloadLimit: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      // Never return the hash by default.
      select: false,
    },
    real_password: {
      type: String,
      
      // Never return the hash by default.
     
    },
    role: {
      type: String,
      enum: ['ADMIN', 'RECRUITER'],
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    dailyDownloadLimit: {
      type: Number,
      default: 10,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>).password;
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return comparePassword(candidate, this.password);
};

// "Recruiters added in date range" KPI (dashboard analytics).
userSchema.index({ role: 1, createdAt: -1 });

export const User: Model<IUser> = model<IUser>('User', userSchema);
