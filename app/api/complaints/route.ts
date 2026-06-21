import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import { Complaint } from '@/models/Complaint';
import { Department } from '@/models/Department';
import { User } from '@/models/User';
import { Officer } from '@/models/Officer';
import { AuditLog } from '@/models/AuditLog';
import { classifyComplaint } from '@/lib/gemini';
import { AlertEngine } from '@/services/AlertEngine';
import { SimilarityService } from '@/services/SimilarityService';
import { RealityEngine } from '@/services/RealityEngine';

// GET /api/complaints
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);

    // Fallbacks for testing/development if next-auth is not configured/active
    let role = session?.user && (session.user as any).role;
    let userId = session?.user && (session.user as any).id;

    const queryRole = searchParams.get('role');
    const queryUserId = searchParams.get('userId');

    if (!role && queryRole) role = queryRole;
    if (!userId && queryUserId) userId = queryUserId;

    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query: any = {};

    if (role === 'citizen') {
      if (!userId) return NextResponse.json({ error: 'Citizen ID required' }, { status: 400 });
      query.citizenId = userId;
    } else if (role === 'officer') {
      if (!userId) return NextResponse.json({ error: 'Officer ID required' }, { status: 400 });
      // Officer can view complaints assigned to them (officerId maps to their User ID)
      query.officerId = userId;
    }
    // CM/Admin role queries everything

    const complaints = await Complaint.find(query)
      .populate('departmentId')
      .populate('officerId', 'name email')
      .populate('citizenId', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(complaints);
  } catch (error: any) {
    console.error('GET /api/complaints error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/complaints
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { title, description, location, imageUrl, voiceUrl, mockCitizenId } = body;

    if (!title || !description || !location) {
      return NextResponse.json({ error: 'Missing title, description or location' }, { status: 400 });
    }

    // Determine Citizen ID
    let citizenId = session?.user && (session.user as any).id;
    if (!citizenId && mockCitizenId) {
      citizenId = mockCitizenId;
    }

    if (!citizenId) {
      // Find or create a default guest citizen to prevent blocking
      let guest = await User.findOne({ email: 'citizen@gov.in' });
      if (!guest) {
        guest = await User.findOne({ role: 'citizen' });
      }
      if (guest) {
        citizenId = guest._id.toString();
      } else {
        return NextResponse.json({ error: 'Unauthorized: Citizen session required' }, { status: 401 });
      }
    }

    // 1. AI Complaint Classification
    const aiResult = await classifyComplaint(title, description);
    
    // 2. Resolve Department
    let department = await Department.findOne({ 
      $or: [
        { name: new RegExp(aiResult.department, 'i') },
        { code: aiResult.department.toUpperCase() }
      ]
    });

    if (!department) {
      // Fallback or create department
      department = await Department.findOne() || await Department.create({
        name: aiResult.department || 'General Administration',
        code: (aiResult.department || 'GEN').substring(0, 4).toUpperCase(),
        slaDays: 7,
        contactEmail: 'support@gov.in'
      });
    }

    // 3. Assign an Officer from that department if available
    // For MVP, we select an officer assigned to this department with the lowest workload
    let assignedOfficerUserId = null;
    const departmentOfficers = await Officer.find({ departmentId: department._id });
    if (departmentOfficers.length > 0) {
      // Find workloads
      const officerWorkloads = await Promise.all(
        departmentOfficers.map(async (off) => {
          const count = await Complaint.countDocuments({ officerId: off.userId, status: { $in: ['assigned', 'in_progress'] } });
          return { officer: off, count };
        })
      );
      // Sort by workload count ascending
      officerWorkloads.sort((a, b) => a.count - b.count);
      assignedOfficerUserId = officerWorkloads[0].officer.userId;
    }

    // 4. Create Complaint Document
    const complaint = await Complaint.create({
      title,
      description,
      category: aiResult.category || 'General',
      departmentId: department._id,
      officerId: assignedOfficerUserId || undefined,
      citizenId,
      location,
      priority: aiResult.priority || 'medium',
      status: assignedOfficerUserId ? 'assigned' : 'pending',
      officialStatus: 'pending',
      imageUrl,
      voiceUrl,
      realityScore: 50,
      realityStatus: 'Needs Verification'
    });

    // 5. Run Alert Engine checks (auto-escalate high-risk safety hazards)
    await AlertEngine.scanComplaintForAlerts(complaint._id);

    // 6. Generate embedding vector via SimilarityService
    try {
      await SimilarityService.computeAndSaveEmbedding(complaint._id);
    } catch (embError) {
      console.error('Failed to generate embedding during complaint creation:', embError);
    }

    // 7. Calculate initial reality score and status
    await RealityEngine.evaluateComplaint(complaint._id);

    // 8. Create Audit Log
    await AuditLog.create({
      complaintId: complaint._id,
      changedBy: citizenId,
      action: 'CREATION',
      oldValue: '',
      newValue: assignedOfficerUserId ? 'assigned' : 'pending'
    });

    // Refresh complaint object to return populated data
    const finalComplaint = await Complaint.findById(complaint._id)
      .populate('departmentId')
      .populate('officerId', 'name email');

    return NextResponse.json(finalComplaint, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/complaints error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
