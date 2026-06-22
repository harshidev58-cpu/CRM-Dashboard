import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Complaint } from '@/models/Complaint';
import { User } from '@/models/User';
import { Department } from '@/models/Department';
import { Officer } from '@/models/Officer';
import { AuditLog } from '@/models/AuditLog';
import { RealityEngine } from '@/services/RealityEngine';
import { TrustEngine } from '@/services/TrustEngine';
import { RealityScore } from '@/models/RealityScore';

const DEMO_TITLE = 'Water contamination and pressure loss at Dwarka Sector 12';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const complaint = await Complaint.findOne({ title: DEMO_TITLE }).populate('officerId');
    
    if (!complaint) {
      return NextResponse.json({ step: 0, status: 'idle', message: 'Demo is ready to begin.' });
    }

    let step = 1;
    if (complaint.status === 'resolved') {
      step = 2;
    } else if (complaint.status === 'reopened') {
      step = 3;
    }

    return NextResponse.json({
      success: true,
      step,
      complaint
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { action } = await req.json();

    const citizen = await User.findOne({ email: 'citizen1@gov.in' });
    const officerUser = await User.findOne({ email: 'officer1@gov.in' });
    const wsb = await Department.findOne({ code: 'WSB' });

    if (!citizen || !officerUser || !wsb) {
      return NextResponse.json({ error: 'Seed users or departments are missing. Please re-seed first.' }, { status: 400 });
    }

    if (action === 'reset') {
      // Clean up previous runs
      const existing = await Complaint.findOne({ title: DEMO_TITLE });
      if (existing) {
        await AuditLog.deleteMany({ complaintId: existing._id });
        await RealityScore.deleteMany({ complaintId: existing._id });
        await Complaint.deleteOne({ _id: existing._id });
      }
      
      // Reset officer trust back to default 85 for a clean demo start
      const officerProfile = await Officer.findOne({ userId: officerUser._id });
      if (officerProfile) {
        officerProfile.trustScore = 85;
        officerProfile.trustHistory = [{ score: 85, updatedAt: new Date(), reason: 'Demo reset' }];
        officerProfile.resolvedComplaints = 20;
        officerProfile.reopenedComplaints = 1;
        officerProfile.suspiciousClosures = 0;
        await officerProfile.save();
      }

      return NextResponse.json({ success: true, step: 0, message: 'Demo state reset successfully.' });
    }

    if (action === 'step1') {
      // Citizen files complaint
      // Remove first if exists
      const existing = await Complaint.findOne({ title: DEMO_TITLE });
      if (existing) {
        await AuditLog.deleteMany({ complaintId: existing._id });
        await RealityScore.deleteMany({ complaintId: existing._id });
        await Complaint.deleteOne({ _id: existing._id });
      }

      const complaint = await Complaint.create({
        title: DEMO_TITLE,
        description: 'Murky brown water coming from taps since morning. Extremely low pressure.',
        category: 'Water Supply',
        departmentId: wsb._id,
        citizenId: citizen._id,
        location: { lat: 28.5912, lng: 77.0422, address: 'Sector 12, Dwarka, Delhi' },
        priority: 'high',
        status: 'pending',
        officialStatus: 'pending',
        ward: 'Ward 1'
      });

      await AuditLog.create({
        complaintId: complaint._id,
        changedBy: citizen._id,
        action: 'CREATION',
        oldValue: '',
        newValue: 'pending'
      });

      // Run initial evaluation
      await RealityEngine.evaluateComplaint(complaint._id);
      const updated = await Complaint.findById(complaint._id);

      return NextResponse.json({
        success: true,
        step: 1,
        message: 'Citizen submitted grievance successfully.',
        complaint: updated
      });
    }

    if (action === 'step2') {
      // Officer resolves complaint
      const complaint = await Complaint.findOne({ title: DEMO_TITLE });
      if (!complaint) {
        return NextResponse.json({ error: 'Complaint not found. Start from step 1.' }, { status: 400 });
      }

      complaint.officerId = officerUser._id;
      complaint.status = 'resolved';
      complaint.officialStatus = 'resolved';
      await complaint.save();

      await AuditLog.create({
        complaintId: complaint._id,
        changedBy: officerUser._id,
        action: 'RESOLVE',
        oldValue: 'pending',
        newValue: 'resolved'
      });

      // Evaluate resolution score
      await RealityEngine.evaluateComplaint(complaint._id);
      const updated = await Complaint.findById(complaint._id).populate('officerId');

      return NextResponse.json({
        success: true,
        step: 2,
        message: 'Officer marked grievance as resolved.',
        complaint: updated
      });
    }

    if (action === 'step3') {
      // Citizen disputes and reopens complaint
      const complaint = await Complaint.findOne({ title: DEMO_TITLE });
      if (!complaint) {
        return NextResponse.json({ error: 'Complaint not found. Start from step 1.' }, { status: 400 });
      }

      complaint.status = 'reopened';
      complaint.officialStatus = 'pending';
      await complaint.save();

      await AuditLog.create({
        complaintId: complaint._id,
        changedBy: citizen._id,
        action: 'REOPEN',
        oldValue: 'resolved',
        newValue: 'reopened'
      });

      // Recalculate score immediately
      await RealityEngine.evaluateComplaint(complaint._id);
      const updated = await Complaint.findById(complaint._id).populate('officerId');

      return NextResponse.json({
        success: true,
        step: 3,
        message: 'Citizen disputed resolution and reopened case.',
        complaint: updated
      });
    }

    if (action === 'step4') {
      // Recalculate trust rating & execute penalties
      const complaint = await Complaint.findOne({ title: DEMO_TITLE });
      if (!complaint) {
        return NextResponse.json({ error: 'Complaint not found.' }, { status: 400 });
      }

      // Re-trigger TrustEngine calculation
      const updatedTrust = await TrustEngine.recalculateOfficerTrust(
        officerUser._id,
        'Citizen disputed resolution on Dwarka Sector 12 water supply complaint'
      );

      // Re-evaluate complaint (which will now penalize the score further due to lower trust)
      await RealityEngine.evaluateComplaint(complaint._id);
      
      const updated = await Complaint.findById(complaint._id).populate('officerId');
      const officerProfile = await Officer.findOne({ userId: officerUser._id });

      return NextResponse.json({
        success: true,
        step: 4,
        message: 'RealityEngine flagged resolution breach; TrustEngine executed penalty on officer.',
        complaint: updated,
        officer: officerProfile,
        updatedTrust
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error executing demo step:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
