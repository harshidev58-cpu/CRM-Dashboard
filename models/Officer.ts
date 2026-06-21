import mongoose, { Schema, Document } from 'mongoose';
import { IOfficer } from '@/types';

export interface IOfficerDocument extends Omit<IOfficer, '_id'>, Document {}

const TrustHistorySchema = new Schema({
  score: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now },
  reason: { type: String, required: true }
}, { _id: false });

const OfficerSchema = new Schema<IOfficerDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  trustScore: { type: Number, required: true, default: 80, min: 0, max: 100 },
  resolvedComplaints: { type: Number, required: true, default: 0 },
  reopenedComplaints: { type: Number, required: true, default: 0 },
  averageResolutionTimeMs: { type: Number, required: true, default: 0 },
  citizenApprovalRate: { type: Number, required: true, default: 100, min: 0, max: 100 },
  suspiciousClosures: { type: Number, required: true, default: 0 },
  trustHistory: { type: [TrustHistorySchema], default: [] }
});

export const Officer = mongoose.models.Officer || mongoose.model<IOfficerDocument>('Officer', OfficerSchema);
