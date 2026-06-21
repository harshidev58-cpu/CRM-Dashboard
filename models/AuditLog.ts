import mongoose, { Schema, Document } from 'mongoose';
import { IAuditLog } from '@/types';

export interface IAuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const AuditLogSchema = new Schema<IAuditLogDocument>({
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true },
  oldValue: { type: String, default: '' },
  newValue: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true }
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
