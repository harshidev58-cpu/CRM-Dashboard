import mongoose, { Schema, Document } from 'mongoose';
import { IRealityScoreHistory } from '@/types';

export interface IRealityScoreDocument extends Omit<IRealityScoreHistory, '_id'>, Document {}

const SignalsSchema = new Schema({
  citizenConfirmation: { type: Boolean },
  complaintReopened: { type: Boolean },
  repeatComplaintsNearbyCount: { type: Number },
  officerTrustScore: { type: Number },
  slaPerformance: { type: String, enum: ['met', 'breached', 'pending'] },
  recurrenceCount: { type: Number },
  communityVerificationCount: { type: Number }
}, { _id: false });

const RealityScoreSchema = new Schema<IRealityScoreDocument>({
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  status: { type: String, enum: ['Verified', 'Needs Verification', 'High Risk'], required: true },
  signalsEvaluated: { type: SignalsSchema, required: true },
  calculatedAt: { type: Date, default: Date.now }
});

export const RealityScore = mongoose.models.RealityScore || mongoose.model<IRealityScoreDocument>('RealityScore', RealityScoreSchema);
