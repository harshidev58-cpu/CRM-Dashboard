import mongoose, { Schema, Document } from 'mongoose';
import { IComplaint } from '@/types';

export interface IComplaintDocument extends Omit<IComplaint, '_id'>, Document {}

const LocationSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true }
}, { _id: false });

const ComplaintSchema = new Schema<IComplaintDocument>({
  title: { type: String, required: true, index: true },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  officerId: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // can reference User/Officer directly
  citizenId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  location: { type: LocationSchema, required: true },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium',
    index: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'assigned', 'in_progress', 'resolved', 'reopened'], 
    default: 'pending',
    index: true
  },
  officialStatus: { 
    type: String, 
    enum: ['pending', 'in_progress', 'resolved'], 
    default: 'pending',
    index: true
  },
  realityScore: { type: Number, required: true, default: 50, min: 0, max: 100 },
  realityStatus: { 
    type: String, 
    enum: ['Verified', 'Needs Verification', 'High Risk'], 
    default: 'Needs Verification',
    index: true
  },
  realityScoreBreakdown: {
    type: [{
      factor: { type: String, required: true },
      delta: { type: Number, required: true }
    }],
    default: []
  },
  isQuestionableResolution: { type: Boolean, default: false, index: true },
  isResurrected: { type: Boolean, default: false, index: true },
  resurrectedFromComplaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', index: true },
  embedding: { type: [Number], default: [] },
  imageUrl: { type: String },
  voiceUrl: { type: String },
  ward: { type: String, default: 'Ward 1', index: true }
}, {
  timestamps: true
});

export const Complaint = mongoose.models.Complaint || mongoose.model<IComplaintDocument>('Complaint', ComplaintSchema);
