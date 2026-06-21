import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import { Complaint } from '@/models/Complaint';
import { AuditLog } from '@/models/AuditLog';
import { RealityEngine } from '@/services/RealityEngine';
import { TrustEngine } from '@/services/TrustEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const { mockCitizenId } = body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    let citizenId = session?.user && (session.user as any).id;
    if (!citizenId && mockCitizenId) {
      citizenId = mockCitizenId;
    }
    if (!citizenId) {
      citizenId = complaint.citizenId.toString(); // Fallback to owner
    }

    const previousStatus = complaint.status;
    complaint.status = 'reopened';
    complaint.officialStatus = 'pending';
    await complaint.save();

    // 1. Evaluate Reality Score (Will drop score significantly due to reopen signal)
    await RealityEngine.evaluateComplaint(complaint._id);

    // 2. Penalize Officer Trust Score if an officer is assigned
    if (complaint.officerId) {
      await TrustEngine.recalculateOfficerTrust(
        complaint.officerId,
        `Grievance Reopened: Refuted resolution for "${complaint.title}"`
      );
    }

    // 3. Create Audit Log
    await AuditLog.create({
      complaintId: complaint._id,
      changedBy: citizenId,
      action: 'REOPEN',
      oldValue: previousStatus,
      newValue: 'reopened'
    });

    const updated = await Complaint.findById(complaint._id)
      .populate('departmentId')
      .populate('officerId', 'name email');

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Reopen Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
