import mongoose, { Schema, Document } from 'mongoose';
import { IDepartment } from '@/types';

export interface IDepartmentDocument extends Omit<IDepartment, '_id'>, Document {}

const DepartmentSchema = new Schema<IDepartmentDocument>({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true, index: true },
  slaDays: { type: Number, required: true, default: 7 },
  contactEmail: { type: String, required: true }
});

export const Department = mongoose.models.Department || mongoose.model<IDepartmentDocument>('Department', DepartmentSchema);
