import { Schema, model, type Document, type Model } from 'mongoose';
import { comparePassword } from '../utils/password';

export type Role = 'ADMIN' | 'RECRUITER';

export interface IUser extends Document {
  email: string;
  password: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
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
    role: {
      type: String,
      enum: ['ADMIN', 'RECRUITER'],
      required: true,
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

export const User: Model<IUser> = model<IUser>('User', userSchema);
