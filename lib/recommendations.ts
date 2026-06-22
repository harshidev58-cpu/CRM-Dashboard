import { Complaint } from '@/models/Complaint';
import { Department } from '@/models/Department';
import { Officer } from '@/models/Officer';
import { Alert } from '@/models/Alert';
import { ResurrectionEvent } from '@/models/ResurrectionEvent';

export interface IRecommendationItem {
  issue: string;
  recommendation: string;
  severity: 'high' | 'critical' | 'warning';
  department?: string;
}

export async function generateAIRecommendations(): Promise<IRecommendationItem[]> {
  const recommendations: IRecommendationItem[] = [];

  // 1. Department Reality Gap Check
  const departments = await Department.find();
  for (const dept of departments) {
    const total = await Complaint.countDocuments({ departmentId: dept._id });
    if (total === 0) continue;

    const resolved = await Complaint.countDocuments({ departmentId: dept._id, status: 'resolved' });
    const verified = await Complaint.countDocuments({ departmentId: dept._id, status: 'resolved', realityStatus: 'Verified' });

    const officialRate = (resolved / total) * 100;
    const verifiedRate = (verified / total) * 100;
    const gap = Math.round(officialRate - verifiedRate);

    if (gap > 15) {
      recommendations.push({
        issue: `${gap}% Reality Gap detected in ${dept.name} (${dept.code})`,
        recommendation: `Conduct independent field audits on resolved cases and assign additional supervisors in high-gap wards to verify closures.`,
        severity: gap > 30 ? 'critical' : 'warning',
        department: dept.code
      });
    }
  }

  // 2. Complaint Resurrelations Check
  const resurrectedCount = await ResurrectionEvent.countDocuments();
  if (resurrectedCount > 0) {
    recommendations.push({
      issue: `${resurrectedCount} Resurfaced Grievance Clusters Detected`,
      recommendation: `Grievances are reappearing shortly after resolution. Dispatch third-party inspectors to review contractor quality standards and examine repeat closure logs.`,
      severity: 'critical'
    });
  }

  // 3. Officer Trust Check
  const suspiciousCount = await Officer.countDocuments({ trustScore: { $lt: 50 } });
  if (suspiciousCount > 0) {
    recommendations.push({
      issue: `${suspiciousCount} High-Risk Officers Identified (Trust Score < 50%)`,
      recommendation: `Temporarily suspend self-closure reporting authorization. Mandatory dual-signature signoffs required for all resolution submissions.`,
      severity: 'critical'
    });
  }

  const reviewCount = await Officer.countDocuments({ trustScore: { $gte: 50, $lt: 80 } });
  if (reviewCount > 0) {
    recommendations.push({
      issue: `${reviewCount} Officers marked Under Review (Trust Score 50-79%)`,
      recommendation: `Assign peer verification checks and monitor weekly resolution times for trust-score recovery.`,
      severity: 'warning'
    });
  }

  // 4. Critical Active Alerts Check
  const criticalAlertsCount = await Alert.countDocuments({ status: 'active', severity: 'critical' });
  if (criticalAlertsCount > 0) {
    recommendations.push({
      issue: `${criticalAlertsCount} Unmitigated Critical Hazards Active`,
      recommendation: `Direct immediate emergency engineering and response vehicles to the coordinates of active safety threats.`,
      severity: 'critical'
    });
  }

  // Fallback
  if (recommendations.length === 0) {
    recommendations.push({
      issue: 'All checked governance channels report healthy telemetry',
      recommendation: 'No corrective directives required. Continue routine automated reality audits.',
      severity: 'warning'
    });
  }

  return recommendations;
}
