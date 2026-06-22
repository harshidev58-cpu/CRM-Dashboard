import { ObjectId } from 'mongoose';

export type UserRole = 'citizen' | 'officer' | 'cm';

export interface IUser {
  _id?: string | ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDepartment {
  _id?: string | ObjectId;
  name: string;
  code: string;
  slaDays: number;
  contactEmail: string;
}

export interface ITrustHistoryEntry {
  score: number;
  updatedAt: Date;
  reason: string;
}

export interface IOfficer {
  _id?: string | ObjectId;
  userId: string | ObjectId; // references User
  departmentId: string | ObjectId; // references Department
  trustScore: number; // 0 - 100
  resolvedComplaints: number;
  reopenedComplaints: number;
  averageResolutionTimeMs: number;
  citizenApprovalRate: number;
  suspiciousClosures: number;
  trustHistory: ITrustHistoryEntry[];
}

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintStatus = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'reopened';
export type RealityStatus = 'Verified' | 'Needs Verification' | 'High Risk';

export interface ILocation {
  lat: number;
  lng: number;
  address: string;
}

export interface IComplaint {
  _id?: string | ObjectId;
  title: string;
  description: string;
  category: string;
  departmentId: string | ObjectId; // references Department
  officerId?: string | ObjectId; // references Officer/User
  citizenId: string | ObjectId; // references User
  location: ILocation;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  officialStatus: 'pending' | 'in_progress' | 'resolved';
  realityScore: number; // 0 - 100
  realityStatus: RealityStatus;
  realityScoreBreakdown?: { factor: string; delta: number }[];
  isQuestionableResolution?: boolean;
  isResurrected?: boolean;
  resurrectedFromComplaintId?: string | ObjectId;
  embedding?: number[]; // Vector embedding for similarity
  imageUrl?: string;
  voiceUrl?: string; // Voice complaint path or content
  ward?: string; // Ward identifier (e.g. Ward 1, Ward 2, Ward 3)
  createdAt?: Date;
  updatedAt?: Date;
}

export type AlertType = 'Fire' | 'Electrical Hazard' | 'Building Collapse' | 'Open Manhole' | 'Water Contamination';
export type AlertSeverity = 'high' | 'critical';

export interface IAlert {
  _id?: string | ObjectId;
  complaintId: string | ObjectId; // references Complaint
  type: AlertType;
  location: ILocation;
  severity: AlertSeverity;
  status: 'active' | 'mitigated';
  createdAt?: Date;
}

export interface IRealityScoreHistory {
  _id?: string | ObjectId;
  complaintId: string | ObjectId; // references Complaint
  score: number;
  status: RealityStatus;
  signalsEvaluated: {
    citizenConfirmation?: boolean;
    complaintReopened?: boolean;
    repeatComplaintsNearbyCount?: number;
    officerTrustScore?: number;
    slaPerformance?: 'met' | 'breached' | 'pending';
    recurrenceCount?: number;
    communityVerificationCount?: number;
  };
  calculatedAt: Date;
}

export interface IAuditLog {
  _id?: string | ObjectId;
  complaintId: string | ObjectId; // references Complaint
  changedBy: string | ObjectId; // references User
  action: string; // e.g. "STATUS_CHANGE", "REOPENED", "CREATION"
  oldValue: string;
  newValue: string;
  timestamp: Date;
}

// AI Classification result
export interface IAISettingResult {
  category: string;
  department: string;
  priority: ComplaintPriority;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Service response types
export interface IRealityCalculationResult {
  score: number;
  status: RealityStatus;
  signals: IRealityScoreHistory['signalsEvaluated'];
  explanationBreakdown?: { factor: string; delta: number }[];
}

export interface IResurrectionEvent {
  _id?: string | ObjectId;
  parentComplaintId: string | ObjectId;
  resurrectedComplaintId: string | ObjectId;
  category: string;
  distanceKm: number;
  timeGapDays: number;
  createdAt?: Date;
}

