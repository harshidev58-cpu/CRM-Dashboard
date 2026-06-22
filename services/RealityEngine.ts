import { Complaint } from '@/models/Complaint';
import { Officer } from '@/models/Officer';
import { Department } from '@/models/Department';
import { RealityScore } from '@/models/RealityScore';
import { ResurrectionEvent } from '@/models/ResurrectionEvent';
import { AuditLog } from '@/models/AuditLog';
import { IRealityCalculationResult, RealityStatus, IRealityScoreHistory } from '@/types';
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
   * Deduction-based scoring model:
   * Starts with a perfect 100, and applies penalty deltas for negative signals.
   * Capped between 0 and 100. Verification threshold is >= 75, High Risk is < 40.
   */
  static async evaluateComplaint(complaintId: string | mongoose.Types.ObjectId): Promise<IRealityCalculationResult> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new Error(`Complaint not found: ${complaintId}`);
    }

    // 1. Complaint Resurrection Detection
    // Check if a similar complaint (same category) was resolved recently (within 30 days) and close by (<= 1.0 km)
    if (complaint.status !== 'resolved' && complaint.createdAt) {
      const thirtyDaysAgo = new Date(complaint.createdAt.getTime() - 30 * 24 * 60 * 60 * 1000);
      const similarResolved = await Complaint.find({
        _id: { $ne: complaint._id },
        category: complaint.category,
        status: 'resolved',
        updatedAt: { $gte: thirtyDaysAgo }
      });

      for (const parent of similarResolved) {
        if (parent.location && parent.location.lat && parent.location.lng) {
          const dist = getDistanceKm(
            complaint.location.lat,
            complaint.location.lng,
            parent.location.lat,
            parent.location.lng
          );

          if (dist <= 1.0) {
            // Resurrection event detected!
            const exists = await ResurrectionEvent.findOne({
              parentComplaintId: parent._id,
              resurrectedComplaintId: complaint._id
            });

            if (!exists) {
              const timeGapDays = Math.round(
                Math.abs(complaint.createdAt.getTime() - (parent.updatedAt?.getTime() || parent.createdAt.getTime())) /
                  (1000 * 60 * 60 * 24)
              );

              await ResurrectionEvent.create({
                parentComplaintId: parent._id,
                resurrectedComplaintId: complaint._id,
                category: complaint.category,
                distanceKm: parseFloat(dist.toFixed(2)),
                timeGapDays
              });

              // Flag previous resolution as questionable
              parent.isQuestionableResolution = true;
              parent.realityScore = Math.max(0, parent.realityScore - 30);
              parent.realityStatus = 'High Risk';
              
              // Add a breakdown entry to the parent to show it was resurfaced
              if (parent.realityScoreBreakdown) {
                parent.realityScoreBreakdown.push({
                  factor: 'Complaint resurfaced nearby / questionable resolution',
                  delta: -30
                });
              } else {
                parent.realityScoreBreakdown = [{
                  factor: 'Complaint resurfaced nearby / questionable resolution',
                  delta: -30
                }];
              }
              await parent.save();
            }

            // Mark current complaint as resurrected
            complaint.isResurrected = true;
            complaint.resurrectedFromComplaintId = parent._id;
          }
        }
      }
    }

    const deductions: { factor: string; delta: number }[] = [];
    const signals: IRealityScoreHistory['signalsEvaluated'] = {
      citizenConfirmation: undefined,
      complaintReopened: false,
      repeatComplaintsNearbyCount: 0,
      officerTrustScore: 80,
      slaPerformance: 'pending',
      recurrenceCount: 0,
      communityVerificationCount: 0,
    };

    // --- Signal 1: Citizen Verification (Max -30 penalty) ---
    const reopenLogsCount = await AuditLog.countDocuments({ complaintId: complaint._id, action: 'REOPEN' });
    if (complaint.status === 'reopened') {
      deductions.push({ factor: 'Citizen disputed closure', delta: -30 });
      signals.citizenConfirmation = false;
      signals.complaintReopened = true;
      
      if (reopenLogsCount >= 2) {
        deductions.push({ factor: 'Complaint reopened twice', delta: -20 });
      }
    } else if (complaint.status === 'resolved') {
      signals.citizenConfirmation = true;
      // No deduction for verified closure
    } else {
      deductions.push({ factor: 'Pending citizen resolution confirmation', delta: -15 });
    }

    // --- Signal 2: SLA Performance (Max -15 penalty) ---
    const dept = await Department.findById(complaint.departmentId);
    if (dept && complaint.status === 'resolved' && complaint.createdAt && complaint.updatedAt) {
      const durationMs = complaint.updatedAt.getTime() - complaint.createdAt.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);
      if (durationDays <= dept.slaDays) {
        signals.slaPerformance = 'met';
      } else {
        signals.slaPerformance = 'breached';
        deductions.push({ factor: 'SLA timeline breached', delta: -15 });
      }
    } else {
      signals.slaPerformance = 'pending';
      if (complaint.status !== 'resolved') {
        // If pending and exceeded SLA days from creation, penalize
        if (dept && complaint.createdAt) {
          const pendingDays = (Date.now() - complaint.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (pendingDays > dept.slaDays) {
            signals.slaPerformance = 'breached';
            deductions.push({ factor: 'SLA timeline breached', delta: -15 });
          }
        }
      }
    }

    // --- Signal 3: Officer Trust Score (Max -10 penalty) ---
    if (complaint.officerId) {
      const officer = await Officer.findOne({ userId: complaint.officerId });
      if (officer) {
        signals.officerTrustScore = officer.trustScore;
        if (officer.trustScore < 50) {
          deductions.push({ factor: 'Officer trust below threshold', delta: -10 });
        } else if (officer.trustScore < 80) {
          deductions.push({ factor: 'Officer trust score under review', delta: -5 });
        }
      }
    }

    // --- Signal 4: Nearby Complaint Density (Max -15 penalty) ---
    let nearbyOverlap = 0;
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeNearby = await Complaint.find({
        _id: { $ne: complaint._id },
        category: complaint.category,
        createdAt: { $gte: thirtyDaysAgo }
      });

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
      if (nearbyOverlap >= 3) {
        deductions.push({ factor: 'Similar complaints nearby', delta: -15 });
      } else if (nearbyOverlap === 2) {
        deductions.push({ factor: 'Multiple similar complaints nearby', delta: -10 });
      } else if (nearbyOverlap === 1) {
        deductions.push({ factor: 'Single similar complaint nearby', delta: -5 });
      }
    } catch (err) {
      console.error('Error fetching nearby complaints:', err);
    }

    // --- Signal 5: Complaint Recurrence (Max -15 penalty) ---
    try {
      const recurringCount = await Complaint.countDocuments({
        citizenId: complaint.citizenId,
        category: complaint.category,
        _id: { $ne: complaint._id },
        'location.address': complaint.location.address,
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      });
      signals.recurrenceCount = recurringCount;
      if (recurringCount >= 3) {
        deductions.push({ factor: 'Frequent recent recurrence at this address', delta: -15 });
      } else if (recurringCount === 2) {
        deductions.push({ factor: 'Multiple recent recurrences at this address', delta: -10 });
      } else if (recurringCount === 1) {
        deductions.push({ factor: 'Single recent recurrence at this address', delta: -5 });
      }
    } catch (err) {
      console.error('Error calculating recurrence:', err);
    }

    // --- Signal 6: Community Verification (Max -15 penalty) ---
    const mockSeedCommunityVotes: Record<string, number> = {
      'Water supply stopped for 3 days in Sector 12': 3,
      'Pipeline leakage near school in Sector 12': 3,
      'Streetlight not working at Connaught Place': 0,
      'Complete darkness due to non-functional streetlights near Connaught Place': 0
    };
    const communityVotes = mockSeedCommunityVotes[complaint.title] || 0;
    signals.communityVerificationCount = communityVotes;
    
    if (communityVotes === 0) {
      deductions.push({ factor: 'No community validation votes', delta: -15 });
    } else if (communityVotes === 1) {
      deductions.push({ factor: 'Limited community validation', delta: -10 });
    } else if (communityVotes === 2) {
      deductions.push({ factor: 'Partial community validation', delta: -5 });
    }

    // --- Special: Resurrection Penalty (Max -25 penalty) ---
    if (complaint.isResurrected) {
      deductions.push({ factor: 'Resurfaced unresolved issue', delta: -25 });
    }

    // Summing deductions from perfect score 100
    let score = 100;
    for (const d of deductions) {
      score += d.delta; // delta is negative
    }
    
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
    complaint.realityScoreBreakdown = deductions;
    await complaint.save();

    // Log the calculation history
    await RealityScore.create({
      complaintId: complaint._id,
      score,
      status,
      signalsEvaluated: signals,
      calculatedAt: new Date()
    });

    return { score, status, signals, explanationBreakdown: deductions };
  }
}

