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
    const { mockOfficerId } = body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    let officerId = session?.user && (session.user as any).id;
    if (!officerId && mockOfficerId) {
      officerId = mockOfficerId;
    }
    if (!officerId) {
      officerId = complaint.officerId?.toString(); // Fallback to current assignee
    }

    if (!officerId) {
      return NextResponse.json({ error: 'Unassigned officer resolution unauthorized' }, { status: 400 });
    }

    const previousStatus = complaint.status;
    complaint.status = 'resolved';
    complaint.officialStatus = 'resolved';
    
    // Add dummy verification or mock image updates if needed
    await complaint.save();

    // 1. Recalculate Reality Score
    await RealityEngine.evaluateComplaint(complaint._id);

    // 2. Recalculate Officer Trust Score (Positive action: resolves complaint, but subject to citizen confirmation)
    await TrustEngine.recalculateOfficerTrust(
      officerId,
      `Marked complaint "${complaint.title}" as officially resolved`
    );

    // 3. Create Audit Log
    await AuditLog.create({
      complaintId: complaint._id,
      changedBy: officerId,
      action: 'RESOLVE',
      oldValue: previousStatus,
      newValue: 'resolved'
    });

    const updated = await Complaint.findById(complaint._id)
      .populate('departmentId')
      .populate('officerId', 'name email');

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Resolve Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
