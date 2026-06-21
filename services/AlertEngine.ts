import { Complaint } from '@/models/Complaint';
import { Alert } from '@/models/Alert';
import { AlertType } from '@/types';
import mongoose from 'mongoose';

export class AlertEngine {
  /**
   * Scans a complaint for life-safety critical issues and raises alerts immediately if needed.
   */
  static async scanComplaintForAlerts(complaintId: string | mongoose.Types.ObjectId): Promise<boolean> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      console.warn(`AlertEngine: Complaint not found: ${complaintId}`);
      return false;
    }

    const textContent = `${complaint.title} ${complaint.description}`.toLowerCase();
    let detectedHazard: AlertType | null = null;

    if (textContent.includes('fire') || textContent.includes('smoke') || textContent.includes('blaze') || textContent.includes('burning')) {
      detectedHazard = 'Fire';
    } else if (textContent.includes('electricity') || textContent.includes('electric') || textContent.includes('spark') || textContent.includes('transformer') || textContent.includes('live wire')) {
      detectedHazard = 'Electrical Hazard';
    } else if (textContent.includes('collapse') || textContent.includes('broken wall') || textContent.includes('sinkhole') || textContent.includes('landslide')) {
      detectedHazard = 'Building Collapse';
    } else if (textContent.includes('manhole') || textContent.includes('open sewer') || textContent.includes('open drain') || textContent.includes('sewage lid')) {
      detectedHazard = 'Open Manhole';
    } else if (textContent.includes('contamination') || textContent.includes('dirty water') || textContent.includes('polluted water') || textContent.includes('toxic water') || textContent.includes('sewage in water')) {
      detectedHazard = 'Water Contamination';
    }

    if (detectedHazard) {
      // 1. Force complaint priority to critical
      complaint.priority = 'critical';
      await complaint.save();

      // 2. Check if an alert already exists for this complaint
      const existingAlert = await Alert.findOne({ complaintId: complaint._id, type: detectedHazard });
      if (!existingAlert) {
        await Alert.create({
          complaintId: complaint._id,
          type: detectedHazard,
          location: complaint.location,
          severity: 'critical',
          status: 'active'
        });
        console.log(`AlertEngine: Triggered critical [${detectedHazard}] alert for Complaint: ${complaint._id}`);
      }
      return true;
    }

    return false;
  }
}
