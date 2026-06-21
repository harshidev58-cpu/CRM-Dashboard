import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '@/types';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const UserSchema = new Schema<IUserDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'officer', 'cm'], default: 'citizen' }
}, {
  timestamps: true
});

export const User = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
