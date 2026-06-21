import mongoose, { Schema, Document } from 'mongoose';
import { IAlert } from '@/types';

export interface IAlertDocument extends Omit<IAlert, '_id'>, Document {}

const LocationSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true }
}, { _id: false });

const AlertSchema = new Schema<IAlertDocument>({
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
  type: { 
    type: String, 
    enum: ['Fire', 'Electrical Hazard', 'Building Collapse', 'Open Manhole', 'Water Contamination'], 
    required: true,
    index: true
  },
  location: { type: LocationSchema, required: true },
  severity: { type: String, enum: ['high', 'critical'], default: 'critical' },
  status: { type: String, enum: ['active', 'mitigated'], default: 'active', index: true }
}, {
  timestamps: true
});

export const Alert = mongoose.models.Alert || mongoose.model<IAlertDocument>('Alert', AlertSchema);
