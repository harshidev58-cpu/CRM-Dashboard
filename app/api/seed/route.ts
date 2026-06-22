import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User } from '@/models/User';
import { Department } from '@/models/Department';
import { Officer } from '@/models/Officer';
import { Complaint } from '@/models/Complaint';
import { Alert } from '@/models/Alert';
import { RealityScore } from '@/models/RealityScore';
import { AuditLog } from '@/models/AuditLog';
import { ResurrectionEvent } from '@/models/ResurrectionEvent';
import { TrustEngine } from '@/services/TrustEngine';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seedSecret = searchParams.get('secret') || req.headers.get('X-Seed-Secret');
    const expectedSecret = process.env.SEED_SECRET || process.env.ADMIN_SEED_SECRET;
    
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      if (!expectedSecret || seedSecret !== expectedSecret) {
        return NextResponse.json({ 
          error: 'Unauthorized. Running seed in production requires a valid ADMIN_SEED_SECRET configuration.' 
        }, { status: 401 });
      }
    } else {
      if (expectedSecret && seedSecret !== expectedSecret) {
        return NextResponse.json({ 
          error: 'Unauthorized. A seed secret was configured but not matched.' 
        }, { status: 401 });
      }
    }

    await dbConnect();

    // 1. Clean out existing database structures
    await User.deleteMany({});
    await Department.deleteMany({});
    await Officer.deleteMany({});
    await Complaint.deleteMany({});
    await Alert.deleteMany({});
    await RealityScore.deleteMany({});
    await AuditLog.deleteMany({});
    await ResurrectionEvent.deleteMany({});

    console.log('Database wiped for 100-complaints seeding.');

    const defaultPass = await bcrypt.hash('password123', 10);

    // 2. Seed 5 Departments
    const depts = await Department.create([
      { name: 'Water & Sewerage Board', code: 'WSB', slaDays: 5, contactEmail: 'waterboard@gov.in' },
      { name: 'Electricity Board', code: 'EB', slaDays: 3, contactEmail: 'electricity@gov.in' },
      { name: 'Municipal Corporation', code: 'MC', slaDays: 7, contactEmail: 'municipal@gov.in' },
      { name: 'Fire and Emergency Services', code: 'FES', slaDays: 1, contactEmail: 'fireservices@gov.in' },
      { name: 'Road & Infrastructure Dept', code: 'RID', slaDays: 4, contactEmail: 'roads@gov.in' }
    ]);
    const [wsb, eb, mc, fes, rid] = depts;

    // 3. Seed 50 Citizens
    const citizensSeed = [];
    for (let i = 1; i <= 50; i++) {
      citizensSeed.push({
        name: `Citizen ${i}`,
        email: `citizen${i}@gov.in`,
        passwordHash: defaultPass,
        role: 'citizen'
      });
    }
    const citizens = await User.create(citizensSeed);
    const primaryCitizen = citizens[0];

    // Seed the CMO Admin Account for direct login
    await User.create({
      name: 'CM Delhi',
      email: 'cm@gov.in',
      passwordHash: await bcrypt.hash('cm123', 10),
      role: 'cm'
    });

    // 4. Seed 10 Officers
    const officersSeed = [];
    for (let i = 1; i <= 10; i++) {
      officersSeed.push({
        name: `Officer ${i}`,
        email: `officer${i}@gov.in`,
        passwordHash: defaultPass,
        role: 'officer'
      });
    }
    const officerUsers = await User.create(officersSeed);

    // Create Officer profiles matching departments
    const officers: any[] = [];
    for (let i = 0; i < 10; i++) {
      let dept = mc;
      if (i < 2) dept = wsb;
      else if (i < 4) dept = eb;
      else if (i < 6) dept = mc;
      else if (i < 8) dept = fes;
      else dept = rid;

      // Make Officer 1 have a high resolution time history but now overloaded (Scenario 2 target)
      let avgTime = 3 * 24 * 60 * 60 * 1000; // 3 days historical average
      let trustScore = 85;
      if (i === 0) {
        trustScore = 55; // Underperforming target
      }

      const offProfile = await Officer.create({
        userId: officerUsers[i]._id,
        departmentId: dept._id,
        trustScore,
        resolvedComplaints: 20,
        reopenedComplaints: i === 0 ? 5 : 1,
        averageResolutionTimeMs: avgTime,
        citizenApprovalRate: i === 0 ? 60 : 92,
        suspiciousClosures: i === 0 ? 3 : 0,
        trustHistory: [{ score: trustScore, updatedAt: new Date(), reason: 'Profile initialized' }]
      });
      officers.push(offProfile);
    }

    const oWater = officerUsers[0]; // Water Officer (Raj Kumar)
    const oRoad = officerUsers[9]; // Road Officer (RID)
    const oElectric = officerUsers[2]; // Electric Officer

    const complaintsArray: any[] = [];

    // ========================================================
    // 3 SUSPICIOUS CLOSURE SCENARIOS (Officially resolved, realityScore < 30)
    // ========================================================
    // Case 1: Water leakage Dwarka Sector 12
    const cSusp1 = {
      title: 'Water supply stopped for 3 days in Sector 12',
      description: 'Murky brown water coming from taps since Tuesday. Water pressure is close to zero.',
      category: 'Water Supply',
      departmentId: wsb._id,
      officerId: oWater._id,
      citizenId: citizens[1]._id,
      location: { lat: 28.5912, lng: 77.0422, address: 'Sector 12, Dwarka, Delhi' },
      priority: 'high',
      status: 'resolved',
      officialStatus: 'resolved',
      ward: 'Ward 1',
      realityScore: 18,
      realityStatus: 'High Risk',
      isQuestionableResolution: true,
      realityScoreBreakdown: [
        { factor: 'Citizen disputed closure', delta: -30 },
        { factor: 'Complaint reopened twice', delta: -20 },
        { factor: 'Similar complaints nearby', delta: -15 },
        { factor: 'Officer trust below threshold', delta: -10 }
      ],
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    };
    complaintsArray.push(cSusp1);

    // Case 2: Streetlight cluster failure in Connaught Place
    const cSusp2 = {
      title: 'Streetlight not working at Connaught Place',
      description: 'Streetlight pole #45 is completely out. Total darkness.',
      category: 'Electrical Hazard',
      departmentId: eb._id,
      officerId: oElectric._id,
      citizenId: citizens[2]._id,
      location: { lat: 28.6304, lng: 77.2177, address: 'Connaught Place, Delhi' },
      priority: 'medium',
      status: 'reopened',
      officialStatus: 'resolved',
      ward: 'Ward 2',
      realityScore: 22,
      realityStatus: 'High Risk',
      isQuestionableResolution: true,
      realityScoreBreakdown: [
        { factor: 'Citizen disputed resolution', delta: -30 },
        { factor: 'Officer trust score under review', delta: -5 },
        { factor: 'No community validation votes', delta: -15 },
        { factor: 'Single similar complaint nearby', delta: -5 }
      ],
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    };
    complaintsArray.push(cSusp2);

    // Case 3: Garbage pileup near Karol Bagh market
    const cSusp3 = {
      title: 'Garbage pileup near Karol Bagh market',
      description: 'Large pile of commercial waste accumulating near the market gate. Foul smell and flies.',
      category: 'Garbage Pileup',
      departmentId: mc._id,
      officerId: officerUsers[4]._id, // MC officer
      citizenId: citizens[3]._id,
      location: { lat: 28.6506, lng: 77.1896, address: 'Ward 3, Karol Bagh, Delhi' },
      priority: 'high',
      status: 'resolved',
      officialStatus: 'resolved',
      ward: 'Ward 3',
      realityScore: 25,
      realityStatus: 'High Risk',
      isQuestionableResolution: true,
      realityScoreBreakdown: [
        { factor: 'Citizen disputed closure', delta: -30 },
        { factor: 'SLA timeline breached', delta: -15 },
        { factor: 'No community validation votes', delta: -15 }
      ],
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    };
    complaintsArray.push(cSusp3);

    // ========================================================
    // 2 COMPLAINT RESURRECTION SCENARIOS (Parent + Resurrected Child)
    // ========================================================
    // Resurrection A: Road Potholes near Connaught Place
    const cResA_Parent = {
      title: 'Road potholes repaired near Connaught Place',
      description: 'Pothole cluster filled on Connaught Place inner circle.',
      category: 'Road Damage',
      departmentId: rid._id,
      officerId: oRoad._id,
      citizenId: citizens[4]._id,
      location: { lat: 28.6300, lng: 77.2170, address: 'Connaught Place, Delhi' },
      priority: 'medium',
      status: 'resolved',
      officialStatus: 'resolved',
      ward: 'Ward 2',
      realityScore: 35,
      realityStatus: 'High Risk',
      isQuestionableResolution: true,
      realityScoreBreakdown: [
        { factor: 'Complaint resurfaced nearby / questionable resolution', delta: -30 },
        { factor: 'Limited community validation', delta: -10 }
      ],
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    };
    complaintsArray.push(cResA_Parent);

    const cResA_Child = {
      title: 'Dangerous potholes reappeared near Connaught Place',
      description: 'The pothole filler has already washed away. Deep craters are back at the same location.',
      category: 'Road Damage',
      departmentId: rid._id,
      officerId: oRoad._id,
      citizenId: citizens[5]._id,
      location: { lat: 28.6302, lng: 77.2172, address: 'Connaught Place, Delhi' }, // within 0.1km
      priority: 'high',
      status: 'assigned',
      officialStatus: 'pending',
      ward: 'Ward 2',
      realityScore: 30,
      realityStatus: 'High Risk',
      isResurrected: true,
      realityScoreBreakdown: [
        { factor: 'Resurfaced unresolved issue', delta: -25 },
        { factor: 'Pending citizen resolution confirmation', delta: -15 },
        { factor: 'No community validation votes', delta: -15 },
        { factor: 'Single similar complaint nearby', delta: -5 }
      ],
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // created today
    };
    complaintsArray.push(cResA_Child);

    // Resurrection B: Sewer Overflow Rohini Sector 8
    const cResB_Parent = {
      title: 'Sewer overflow fixed at Rohini Sector 8',
      description: 'Blockage cleared in main drain pipe behind Sector 8 market.',
      category: 'Water Supply',
      departmentId: wsb._id,
      officerId: oWater._id,
      citizenId: citizens[6]._id,
      location: { lat: 28.7032, lng: 77.1215, address: 'Sector 8, Rohini, Delhi' },
      priority: 'high',
      status: 'resolved',
      officialStatus: 'resolved',
      ward: 'Ward 1',
      realityScore: 30,
      realityStatus: 'High Risk',
      isQuestionableResolution: true,
      realityScoreBreakdown: [
        { factor: 'Complaint resurfaced nearby / questionable resolution', delta: -30 },
        { factor: 'No community validation votes', delta: -15 }
      ],
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    };
    complaintsArray.push(cResB_Parent);

    const cResB_Child = {
      title: 'Sewer backflow resurfaced at Rohini Sector 8',
      description: 'Sewerage black water overflow back on the streets. Resolution was temporary.',
      category: 'Water Supply',
      departmentId: wsb._id,
      officerId: oWater._id,
      citizenId: citizens[7]._id,
      location: { lat: 28.7034, lng: 77.1216, address: 'Sector 8, Rohini, Delhi' },
      priority: 'high',
      status: 'pending',
      officialStatus: 'pending',
      ward: 'Ward 1',
      realityScore: 25,
      realityStatus: 'High Risk',
      isResurrected: true,
      realityScoreBreakdown: [
        { factor: 'Resurfaced unresolved issue', delta: -25 },
        { factor: 'Pending citizen resolution confirmation', delta: -15 },
        { factor: 'No community validation votes', delta: -15 }
      ],
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // created today
    };
    complaintsArray.push(cResB_Child);

    // ========================================================
    // 2 CRITICAL HAZARD SCENARIOS (High priority + Active Alerts)
    // ========================================================
    const cHaz1 = {
      title: 'High-voltage wire sparking near Dwarka Metro Pillar',
      description: 'Live electrical cable hanging loose and sparking continuously near Metro Pillar 104. Major shock risk.',
      category: 'Electrical Hazard',
      departmentId: eb._id,
      officerId: oElectric._id,
      citizenId: citizens[8]._id,
      location: { lat: 28.5925, lng: 77.0450, address: 'Sector 12, Dwarka, Delhi' },
      priority: 'critical',
      status: 'assigned',
      officialStatus: 'pending',
      ward: 'Ward 1',
      realityScore: 40,
      realityStatus: 'Needs Verification',
      realityScoreBreakdown: [
        { factor: 'Pending citizen resolution confirmation', delta: -15 },
        { factor: 'No community validation votes', delta: -15 }
      ],
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // created 3 hours ago
    };
    complaintsArray.push(cHaz1);

    const cHaz2 = {
      title: 'Deep open manhole on Main Karol Bagh Road',
      description: 'Cover missing on main sewer line directly in the path of oncoming traffic. Extremely dangerous.',
      category: 'Open Manhole',
      departmentId: wsb._id,
      officerId: oWater._id,
      citizenId: citizens[9]._id,
      location: { lat: 28.6515, lng: 77.1910, address: 'Ward 3, Karol Bagh, Delhi' },
      priority: 'critical',
      status: 'assigned',
      officialStatus: 'pending',
      ward: 'Ward 3',
      realityScore: 35,
      realityStatus: 'High Risk',
      realityScoreBreakdown: [
        { factor: 'Pending citizen resolution confirmation', delta: -15 },
        { factor: 'No community validation votes', delta: -15 },
        { factor: 'Single similar complaint nearby', delta: -5 }
      ],
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // created 5 hours ago
    };
    complaintsArray.push(cHaz2);

    // ========================================================
    // FILLER DATA: Generate remaining complaints to hit exactly 100
    // ========================================================
    const categories = ['Water Supply', 'Road Damage', 'Electrical Hazard', 'Open Manhole', 'Garbage Pileup', 'Fire Incident', 'Electricity Supply'];
    const wards = ['Ward 1', 'Ward 2', 'Ward 3'];
    const statuses = ['resolved', 'assigned', 'in_progress', 'pending'];
    const priorities = ['low', 'medium', 'high', 'critical'];

    const totalNeeded = 100;
    const currentCount = complaintsArray.length;
    const fillerCount = totalNeeded - currentCount;

    for (let i = 0; i < fillerCount; i++) {
      const citizenIdx = Math.floor(Math.random() * 50);
      
      // Overloaded Officers check: Force officerIdx to 0 or 2 for the first 32 filler complaints
      let officerIdx = Math.floor(Math.random() * 10);
      if (i < 16) {
        officerIdx = 0; // oWater
      } else if (i >= 16 && i < 32) {
        officerIdx = 2; // oElectric
      }

      const targetOfficerUser = officerUsers[officerIdx];
      const targetOfficerProfile = officers[officerIdx];
      const ward = wards[Math.floor(Math.random() * wards.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];

      let dept = mc;
      if (category.includes('Water') || category.includes('Manhole')) dept = wsb;
      else if (category.includes('Electrical') || category.includes('Supply')) dept = eb;
      else if (category.includes('Fire')) dept = fes;
      else if (category.includes('Road')) dept = rid;

      let status = statuses[Math.floor(Math.random() * statuses.length)];
      let officialStatus = status === 'resolved' ? 'resolved' : 'pending';
      const priority = priorities[Math.floor(Math.random() * priorities.length)];

      // Seed dates across the previous 60 days
      const daysAgo = Math.floor(Math.random() * 60) + 1; // 1 to 60 days
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      // If resolved, set updatedAt to a few days after creation
      let updatedAt = createdAt;
      if (status === 'resolved') {
        const resolveDays = Math.floor(Math.random() * 5) + 1;
        updatedAt = new Date(createdAt.getTime() + resolveDays * 24 * 60 * 60 * 1000);
      }

      // Reality score modeling
      let realityScore = 50;
      let realityStatus: 'Verified' | 'Needs Verification' | 'High Risk' = 'Needs Verification';

      // For Road & Infrastructure Dept (RID) - Force huge reality gap
      if (dept._id.toString() === rid._id.toString()) {
        status = 'resolved';
        officialStatus = 'resolved';
        if (Math.random() < 0.8) {
          realityScore = Math.floor(Math.random() * 20) + 15; // 15 - 35
          realityStatus = 'High Risk';
        } else {
          realityScore = Math.floor(Math.random() * 15) + 80; // 80 - 95
          realityStatus = 'Verified';
        }
      } else {
        if (status === 'resolved') {
          realityScore = Math.floor(Math.random() * 20) + 80; // 80 - 100
          realityStatus = 'Verified';
        } else {
          realityScore = Math.floor(Math.random() * 30) + 35; // 35 - 65
          realityStatus = realityScore < 40 ? 'High Risk' : 'Needs Verification';
        }
      }

      complaintsArray.push({
        title: `${category} issue flagged by citizen`,
        description: `Citizen reported a standard ${category.toLowerCase()} grievance at coordinates. Requesting standard department dispatch.`,
        category,
        departmentId: dept._id,
        officerId: targetOfficerUser._id,
        citizenId: citizens[citizenIdx]._id,
        location: { 
          lat: 28.6139 + (Math.random() - 0.5) * 0.05, 
          lng: 77.2090 + (Math.random() - 0.5) * 0.05, 
          address: `Colony Block ${i}, ${ward}, Delhi` 
        },
        priority,
        status,
        officialStatus,
        ward,
        realityScore,
        realityStatus,
        realityScoreBreakdown: [
          { factor: status === 'resolved' ? 'Citizen verified resolution' : 'Pending resolution confirmation', delta: status === 'resolved' ? 0 : -15 }
        ],
        createdAt,
        updatedAt
      });
    }

    const seededComplaints = await Complaint.create(complaintsArray);

    // Seed Resurrection Events in the DB
    const resParentA = seededComplaints.find((c: any) => c.title === 'Road potholes repaired near Connaught Place');
    const resChildA = seededComplaints.find((c: any) => c.title === 'Dangerous potholes reappeared near Connaught Place');
    if (resParentA && resChildA) {
      await ResurrectionEvent.create({
        parentComplaintId: resParentA._id,
        resurrectedComplaintId: resChildA._id,
        category: 'Road Damage',
        distanceKm: 0.1,
        timeGapDays: 5
      });
    }

    const resParentB = seededComplaints.find((c: any) => c.title === 'Sewer overflow fixed at Rohini Sector 8');
    const resChildB = seededComplaints.find((c: any) => c.title === 'Sewer backflow resurfaced at Rohini Sector 8');
    if (resParentB && resChildB) {
      await ResurrectionEvent.create({
        parentComplaintId: resParentB._id,
        resurrectedComplaintId: resChildB._id,
        category: 'Water Supply',
        distanceKm: 0.05,
        timeGapDays: 10
      });
    }

    // 7. Seed corresponding escalated safety alerts and audit logs
    for (const c of seededComplaints) {
      await AuditLog.create({
        complaintId: c._id,
        changedBy: primaryCitizen._id,
        action: 'CREATION',
        oldValue: '',
        newValue: c.status
      });

      if (c.status === 'resolved') {
        await AuditLog.create({
          complaintId: c._id,
          changedBy: c.officerId || oWater._id,
          action: 'RESOLVE',
          oldValue: 'assigned',
          newValue: 'resolved'
        });
      }

      // If it matches water cluster, open manhole, or live wires, log alerts
      const titleLower = c.title.toLowerCase();
      if (titleLower.includes('manhole') || titleLower.includes('dirty water') || titleLower.includes('sparking') || titleLower.includes('leakage')) {
        let type: any = 'Water Contamination';
        if (titleLower.includes('manhole')) type = 'Open Manhole';
        else if (titleLower.includes('sparking')) type = 'Electrical Hazard';

        await Alert.create({
          complaintId: c._id,
          type,
          location: c.location,
          severity: c.priority === 'critical' ? 'critical' : 'high',
          status: c.status === 'resolved' ? 'mitigated' : 'active'
        });
      }
    }

    // Recalculate trust profiles for overloaded/underperforming officers
    for (const off of officers) {
      await TrustEngine.recalculateOfficerTrust(off.userId, 'Initial database sync');
    }

    return NextResponse.json({
      success: true,
      message: 'MongoDB seeded successfully with exactly 100 complaints and enhanced hackathon demo scenarios.',
      statistics: {
        citizens: 50,
        officers: 10,
        departments: 5,
        totalComplaints: seededComplaints.length,
        anomaliesSeeded: [
          '3 Suspicious Closure Scenarios',
          '2 Complaint Resurrection Scenarios',
          '2 Critical Active Hazards with Alerts',
          '2 Overloaded Officers (Water & Electric)',
          'Road & Infrastructure Dept (RID) reality gap'
        ]
      }
    });
  } catch (error: any) {
    console.error('100 Complaints Seeding Error:', error);
    return NextResponse.json({ error: error.message || 'Seeding Failed' }, { status: 500 });
  }
}
