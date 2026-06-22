import { Complaint } from '@/models/Complaint';
import { Alert } from '@/models/Alert';
import { Department } from '@/models/Department';
import { Officer } from '@/models/Officer';
import { User } from '@/models/User';
import { generateAIRecommendations } from '@/lib/recommendations';

export interface IDailyBriefReport {
  date: string;
  overallMetrics: {
    totalComplaints: number;
    officialResolutionRate: number;
    realityVerifiedRate: number;
    realityGap: number;
  };
  highRiskDepartments: {
    name: string;
    code: string;
    realityGap: number;
    totalComplaints: number;
    unresolvedCount: number;
  }[];
  criticalAlerts: {
    type: string;
    address: string;
    complaintTitle: string;
    createdAt: Date;
  }[];
  suspiciousClosures: {
    title: string;
    departmentName: string;
    officerName: string;
    officerTrustScore: number;
    realityScore: number;
  }[];
  recommendedActions: string[];
}

export class BriefService {
  /**
   * Compiles data for the Daily CM Briefing.
   */
  static async generateDailyBrief(): Promise<IDailyBriefReport> {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const total = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: 'resolved' });
    const verified = await Complaint.countDocuments({ status: 'resolved', realityStatus: 'Verified' });

    const officialRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const verifiedRate = total > 0 ? Math.round((verified / total) * 100) : 0;
    const realityGap = officialRate - verifiedRate;

    // 1. High Risk Departments (sorted by highest reality gap)
    const departments = await Department.find();
    const deptList = [];
    for (const dept of departments) {
      const deptComplaints = await Complaint.countDocuments({ departmentId: dept._id });
      const deptResolved = await Complaint.countDocuments({ departmentId: dept._id, status: 'resolved' });
      const deptVerified = await Complaint.countDocuments({ departmentId: dept._id, status: 'resolved', realityStatus: 'Verified' });
      const deptUnresolved = await Complaint.countDocuments({ departmentId: dept._id, status: { $ne: 'resolved' } });

      const officialD = deptComplaints > 0 ? (deptResolved / deptComplaints) * 100 : 0;
      const verifiedD = deptComplaints > 0 ? (deptVerified / deptComplaints) * 100 : 0;
      const gap = officialD - verifiedD;

      if (deptComplaints > 0) {
        deptList.push({
          name: dept.name,
          code: dept.code,
          realityGap: Math.round(gap),
          totalComplaints: deptComplaints,
          unresolvedCount: deptUnresolved
        });
      }
    }
    // Sort departments by reality gap descending
    const highRiskDepartments = deptList.sort((a, b) => b.realityGap - a.realityGap).slice(0, 3);

    // 2. Critical Alerts
    const alerts = await Alert.find({ status: 'active' }).populate('complaintId');
    const criticalAlerts = alerts.map(a => {
      const comp = a.complaintId as any;
      return {
        type: a.type,
        address: a.location.address,
        complaintTitle: comp?.title || 'Unknown Grievance',
        createdAt: a.createdAt || new Date()
      };
    });

    // 3. Suspicious Closures (Officially resolved but reality status is High Risk)
    const suspiciousList = await Complaint.find({
      status: 'resolved',
      realityStatus: 'High Risk'
    }).populate('departmentId').populate('officerId');

    const suspiciousClosures = [];
    for (const item of suspiciousList) {
      // Find officer trust score
      let trustScore = 80;
      let officerName = 'Unassigned';
      if (item.officerId) {
        const officer = await Officer.findOne({ userId: item.officerId });
        if (officer) {
          trustScore = officer.trustScore;
        }
        officerName = (item.officerId as any).name || 'Unknown Officer';
      }
      suspiciousClosures.push({
        title: item.title,
        departmentName: item.departmentId ? (item.departmentId as any).name : 'General',
        officerName,
        officerTrustScore: trustScore,
        realityScore: item.realityScore
      });
    }

    // 4. Generate Recommended Actions dynamically based on data
    const aiRecs = await generateAIRecommendations();
    const recommendedActions = aiRecs.map(r => `${r.issue}: ${r.recommendation}`);
    if (recommendedActions.length === 0) {
      recommendedActions.push('All Checked governance performance metrics are within normal ranges. Continue routine SLA audits.');
    }

    return {
      date: today,
      overallMetrics: {
        totalComplaints: total,
        officialResolutionRate: officialRate,
        realityVerifiedRate: verifiedRate,
        realityGap: realityGap
      },
      highRiskDepartments,
      criticalAlerts,
      suspiciousClosures: suspiciousClosures.slice(0, 5), // return top 5
      recommendedActions
    };
  }
}
