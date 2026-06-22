import { Complaint } from '@/models/Complaint';
import { Alert } from '@/models/Alert';
import { Department } from '@/models/Department';
import { Officer } from '@/models/Officer';
import { User } from '@/models/User';
import { askGeminiCopilot } from '@/lib/gemini';

export class CopilotEngine {
  /**
   * Builds the database context and queries Gemini to answer questions for the Chief Minister.
   */
  static async queryCopilot(question: string): Promise<string> {
    // 1. Gather all required metrics for context
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
    const reopenedComplaints = await Complaint.countDocuments({ status: 'reopened' });
    const pendingComplaints = await Complaint.countDocuments({ status: 'pending' });

    // Reality Gap Metrics
    const verifiedResolved = await Complaint.countDocuments({ status: 'resolved', realityStatus: 'Verified' });
    
    // Official resolution rate: resolved / total
    const officialResRate = totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;
    // Reality verified resolution rate: verifiedResolved / total
    const realityResRate = totalComplaints > 0 ? (verifiedResolved / totalComplaints) * 100 : 0;
    const realityGap = officialResRate - realityResRate;

    // Critical Alerts
    const activeAlerts = await Alert.find({ status: 'active' }).populate('complaintId');
    const alertsSummary = activeAlerts.map(a => {
      const comp = a.complaintId as any;
      return `- [CRITICAL ALERT] ${a.type} at ${a.location.address} (Complaint Ref: ${comp?.title || 'Unknown'})`;
    }).join('\n');

    // Suspicious Closures (Resolved officially but reality score indicates high risk)
    const suspiciousClosuresList = await Complaint.find({
      status: 'resolved',
      realityStatus: 'High Risk'
    }).populate('officerId');

    const suspiciousSummary = suspiciousClosuresList.map(c => {
      const officerName = c.officerId ? (c.officerId as any).name : 'Unassigned';
      return `- "${c.title}" (Dept: ${c.category}, Reality Score: ${c.realityScore}, Resolved by: ${officerName})`;
    }).join('\n');

    // Department Analysis
    const departments = await Department.find();
    const deptStats: string[] = [];
    for (const dept of departments) {
      const deptComplaints = await Complaint.countDocuments({ departmentId: dept._id });
      const deptResolved = await Complaint.countDocuments({ departmentId: dept._id, status: 'resolved' });
      const deptVerified = await Complaint.countDocuments({ departmentId: dept._id, status: 'resolved', realityStatus: 'Verified' });
      
      const officialRate = deptComplaints > 0 ? (deptResolved / deptComplaints) * 100 : 0;
      const verifiedRate = deptComplaints > 0 ? (deptVerified / deptComplaints) * 100 : 0;
      const gap = officialRate - verifiedRate;

      deptStats.push(`- Department: ${dept.name} (${dept.code})
  Total Complaints: ${deptComplaints}
  Official Resolution Rate: ${officialRate.toFixed(1)}%
  Reality Verified Rate: ${verifiedRate.toFixed(1)}%
  Reality Gap: ${gap.toFixed(1)}%`);
    }

    // High Risk Officers
    const lowTrustOfficers = await Officer.find({ trustScore: { $lt: 60 } }).populate('userId');
    const officerSummary = lowTrustOfficers.map(o => {
      const u = o.userId as any;
      return `- Officer: ${u?.name || 'Unknown'} (Trust Score: ${o.trustScore}%, Citizen Approval: ${o.citizenApprovalRate}%, Suspicious Closures: ${o.suspiciousClosures})`;
    }).join('\n');

    // 2. Assemble context document
    const context = `
Civic Shield Reality Engine Context:
---
OVERALL METRICS:
- Total Grievances Submitted: ${totalComplaints}
- Pending: ${pendingComplaints}
- Official Resolved: ${resolvedComplaints} (Rate: ${officialResRate.toFixed(1)}%)
- Reality Verified Resolved: ${verifiedResolved} (Rate: ${realityResRate.toFixed(1)}%)
- Overall Reality Gap: ${realityGap.toFixed(1)}%
- Reopened by Citizens: ${reopenedComplaints}

ACTIVE CRITICAL ALERTS:
${alertsSummary || 'No active critical safety alerts.'}

SUSPICIOUS CLOSURES (Officer marked RESOLVED but Reality Score is High Risk < 40):
${suspiciousSummary || 'No suspicious closures flagged.'}

DEPARTMENT PERFORMANCE:
${deptStats.join('\n')}

LOW TRUST OFFICERS (Score < 60%):
${officerSummary || 'No low trust officers flagged.'}
---
`;

    // 3. Request analysis from Gemini Copilot
    return await askGeminiCopilot(question, context);
  }
}
