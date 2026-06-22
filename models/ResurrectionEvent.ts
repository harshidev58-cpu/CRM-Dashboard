import mongoose, { Schema, Document } from 'mongoose';
import { IResurrectionEvent } from '@/types';

export interface IResurrectionEventDocument extends Omit<IResurrectionEvent, '_id'>, Document {}

const ResurrectionEventSchema = new Schema<IResurrectionEventDocument>({
  parentComplaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
  resurrectedComplaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
  category: { type: String, required: true, index: true },
  distanceKm: { type: Number, required: true },
  timeGapDays: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export const ResurrectionEvent = mongoose.models.ResurrectionEvent || mongoose.model<IResurrectionEventDocument>('ResurrectionEvent', ResurrectionEventSchema);
