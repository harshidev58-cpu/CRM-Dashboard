import { Officer } from '@/models/Officer';
import { Complaint } from '@/models/Complaint';
import mongoose from 'mongoose';

export class TrustEngine {
  /**
   * Recalculates the trust score for a specific officer.
   */
  static async recalculateOfficerTrust(officerUserId: string | mongoose.Types.ObjectId, reason: string): Promise<number> {
    const officer = await Officer.findOne({ userId: officerUserId });
    if (!officer) {
      console.warn(`No officer record found for userId: ${officerUserId}`);
      return 80; // default trust score
    }

    // 1. Fetch complaints associated with this officer
    const complaints = await Complaint.find({ officerId: officerUserId });

    const totalAssigned = complaints.length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const reopened = complaints.filter(c => c.status === 'reopened').length;
    
    // Suspicious closures: complaints marked as resolved/pending by officer but realityStatus is 'High Risk'
    const suspicious = complaints.filter(c => c.realityStatus === 'High Risk' && (c.status === 'resolved' || c.status === 'reopened')).length;

    // Average resolution time (in milliseconds)
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    for (const c of complaints) {
      if (c.status === 'resolved' && c.createdAt && c.updatedAt) {
        totalResolutionTime += c.updatedAt.getTime() - c.createdAt.getTime();
        resolvedCount++;
      }
    }
    const avgTimeMs = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    // Citizen approval rate: % of resolved complaints that don't get reopened or are citizen confirmed.
    // Let's compute: approval rate = (resolved - reopened - suspicious) / resolved
    let approvalRate = 100;
    if (resolved > 0) {
      const positiveResolutions = Math.max(0, resolved - reopened - suspicious);
      approvalRate = Math.round((positiveResolutions / resolved) * 100);
    }

    // Trust calculation logic:
    // Base is 70 points
    // + Approval Rate contribution (up to +20 points)
    // - Reopen Rate penalty (up to -20 points)
    // - Suspicious closure penalty (-15 points per closure)
    // - High Average Resolution Time (> 10 days) penalty (-10 points)
    let trustScore = 70;
    
    // Approval weight
    trustScore += (approvalRate / 100) * 20;

    // Reopen weight
    const totalResolvedOrReopened = resolved + reopened;
    if (totalResolvedOrReopened > 0) {
      const reopenRate = reopened / totalResolvedOrReopened;
      trustScore -= (reopenRate * 20);
    }

    // Suspicious closures weight
    trustScore -= (suspicious * 15);

    // Speed weight
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
    if (avgTimeMs > tenDaysMs) {
      trustScore -= 10;
    } else if (avgTimeMs > 0 && avgTimeMs < 3 * 24 * 60 * 60 * 1000) {
      // Resolved under 3 days gets a trust boost
      trustScore += 10;
    }

    // Keep it between 0 and 100
    trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));

    // Update database fields
    officer.resolvedComplaints = resolved;
    officer.reopenedComplaints = reopened;
    officer.averageResolutionTimeMs = avgTimeMs;
    officer.citizenApprovalRate = approvalRate;
    officer.suspiciousClosures = suspicious;
    
    // Check if the trust score changed or if we need to append history
    const oldScore = officer.trustScore;
    officer.trustScore = trustScore;

    officer.trustHistory.push({
      score: trustScore,
      updatedAt: new Date(),
      reason: `${reason} (Previous score: ${oldScore})`
    });

    // Save
    await officer.save();
    return trustScore;
  }
}
