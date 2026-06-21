import { Complaint } from '@/models/Complaint';
import { Officer } from '@/models/Officer';
import { Department } from '@/models/Department';
import { RealityScore } from '@/models/RealityScore';
import { IRealityCalculationResult, RealityStatus } from '@/types';
import mongoose from 'mongoose';

// Haversine formula to compute distance in km
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export class RealityEngine {
  /**
   * Evaluates the reality score of a complaint and updates its document.
   * Balanced weighting model:
   * 1. Citizen Verification (Capped at 25%)
   * 2. SLA Performance (15%)
   * 3. Officer Trust Score (15%)
   * 4. Nearby Complaint Density (15%)
   * 5. Complaint Recurrence (15%)
   * 6. Community Verification (15%)
   * Total Max Score: 100. Verification threshold is >= 75.
   */
  static async evaluateComplaint(complaintId: string | mongoose.Types.ObjectId): Promise<IRealityCalculationResult> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new Error(`Complaint not found: ${complaintId}`);
    }

    // Initial signal values
    let citizenWeight = 10; // Baseline neutral weight (Pending)
    let slaWeight = 0; // Default pending / not met
    let trustWeight = 8; // Default neutral trust
    let densityWeight = 15; // Default: no nearby complaints
    let recurrenceWeight = 15; // Default: no recurrence
    let communityWeight = 0; // Default: no community confirmation

    const signals: IRealityCalculationResult['signals'] = {
      citizenConfirmation: undefined,
      complaintReopened: false,
      repeatComplaintsNearbyCount: 0,
      officerTrustScore: 80,
      slaPerformance: 'pending',
      recurrenceCount: 0,
      communityVerificationCount: 0,
    };

    // 1. Citizen Verification Signal (Max 25%)
    if (complaint.status === 'resolved') {
      citizenWeight = 25; // Confirmed resolved
      signals.citizenConfirmation = true;
    } else if (complaint.status === 'reopened') {
      citizenWeight = 0; // Disputed / reopened
      signals.citizenConfirmation = false;
      signals.complaintReopened = true;
    } else {
      // Pending resolution
      citizenWeight = 10;
    }

    // 2. SLA Performance Signal (Max 15%)
    const dept = await Department.findById(complaint.departmentId);
    if (dept && complaint.status === 'resolved' && complaint.createdAt && complaint.updatedAt) {
      const durationMs = complaint.updatedAt.getTime() - complaint.createdAt.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);
      if (durationDays <= dept.slaDays) {
        slaWeight = 15; // SLA Met
        signals.slaPerformance = 'met';
      } else {
        slaWeight = 0; // SLA Breached
        signals.slaPerformance = 'breached';
      }
    } else {
      signals.slaPerformance = 'pending';
      slaWeight = 0;
    }

    // 3. Officer Trust Score Signal (Max 15%)
    if (complaint.officerId) {
      const officer = await Officer.findOne({ userId: complaint.officerId });
      if (officer) {
        signals.officerTrustScore = officer.trustScore;
        if (officer.trustScore >= 85) {
          trustWeight = 15; // High Trust
        } else if (officer.trustScore >= 60) {
          trustWeight = 10; // Moderate Trust
        } else {
          trustWeight = 0; // Low Trust
        }
      }
    } else {
      signals.officerTrustScore = 80;
      trustWeight = 10; // Default moderate trust for unassigned/system
    }

    // 4. Nearby Complaint Density Signal (Max 15%)
    try {
      const activeNearby = await Complaint.find({
        _id: { $ne: complaint._id },
        category: complaint.category,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      let nearbyOverlap = 0;
      for (const item of activeNearby) {
        const dist = getDistanceKm(
          complaint.location.lat,
          complaint.location.lng,
          item.location.lat,
          item.location.lng
        );
        if (dist <= 1.0) {
          nearbyOverlap++;
        }
      }

      signals.repeatComplaintsNearbyCount = nearbyOverlap;
      if (nearbyOverlap === 0) {
        densityWeight = 15;
      } else if (nearbyOverlap === 1) {
        densityWeight = 10;
      } else if (nearbyOverlap === 2) {
        densityWeight = 5;
      } else {
        densityWeight = 0; // High density overlaps
      }
    } catch (err) {
      console.error('Error fetching nearby complaints:', err);
    }

    // 5. Complaint Recurrence Signal (Max 15%)
    try {
      const recurringCount = await Complaint.countDocuments({
        citizenId: complaint.citizenId,
        category: complaint.category,
        _id: { $ne: complaint._id },
        'location.address': complaint.location.address,
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      });
      signals.recurrenceCount = recurringCount;
      if (recurringCount === 0) {
        recurrenceWeight = 15;
      } else if (recurringCount === 1) {
        recurrenceWeight = 10;
      } else if (recurringCount === 2) {
        recurrenceWeight = 5;
      } else {
        recurrenceWeight = 0; // Frequent recurrence
      }
    } catch (err) {
      console.error('Error calculating recurrence:', err);
    }

    // 6. Community Verification (Max 15%)
    // Mimics neighborhood verification votes. For MVP, we can simulate community votes.
    // Let's retrieve votes from database, or mock it dynamically depending on complaint ID.
    // If it's a seed complaint, we can provide preset community votes.
    const mockSeedCommunityVotes: Record<string, number> = {
      'Water leakage in Colony Sector B': 3,  // 3 votes -> +15
      'Pothole road repair near Fort Circle': 0, // 0 votes -> +0
      'Open sewer manhole near Primary School Gate': 0
    };
    const communityVotes = mockSeedCommunityVotes[complaint.title] || 0;
    signals.communityVerificationCount = communityVotes;
    
    if (communityVotes >= 3) {
      communityWeight = 15;
    } else if (communityVotes === 2) {
      communityWeight = 10;
    } else if (communityVotes === 1) {
      communityWeight = 5;
    } else {
      communityWeight = 0;
    }

    // Summing weights
    let score = citizenWeight + slaWeight + trustWeight + densityWeight + recurrenceWeight + communityWeight;
    
    // Bounds check
    score = Math.max(0, Math.min(100, score));

    // Map Reality Status
    let status: RealityStatus = 'Needs Verification';
    if (score >= 75) {
      status = 'Verified';
    } else if (score < 40) {
      status = 'High Risk';
    }

    // Write updates to DB
    complaint.realityScore = score;
    complaint.realityStatus = status;
    await complaint.save();

    // Log the calculation history
    await RealityScore.create({
      complaintId: complaint._id,
      score,
      status,
      signalsEvaluated: signals,
      calculatedAt: new Date()
    });

    return { score, status, signals };
  }
}
