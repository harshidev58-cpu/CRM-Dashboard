import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { User } from '@/models/User';
import { Department } from '@/models/Department';
import { Officer } from '@/models/Officer';
import { Complaint } from '@/models/Complaint';
import { Alert } from '@/models/Alert';
import { RealityScore } from '@/models/RealityScore';
import { AuditLog } from '@/models/AuditLog';
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
      name: 'CM Devendra Fadnavis',
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
    // SCENARIO 1: HIDDEN WATER INFRASTRUCTURE FAILURE (Sector 12)
    // ========================================================
    const s1Titles = [
      { t: 'Water supply stopped for 3 days in Sector 12', d: 'Since Tuesday water supply is completely dry in block C.' },
      { t: 'Low water pressure in Sector 12', d: 'Hardly trickling. Water is not reaching the storage tanks.' },
      { t: 'Dirty water coming from taps in Sector 12', d: 'Drinking supply is muddy and brown. Heavy foul smell.' },
      { t: 'Pipeline leakage near school in Sector 12', d: 'Huge gush of clean water leaking from underground pipe near the primary gate.' },
      { t: 'Repeated water shortage complaints in Sector 12', d: 'Water pressure drops and stops every alternate day. Area crisis.' }
    ];

    for (let i = 0; i < s1Titles.length; i++) {
      complaintsArray.push({
        title: s1Titles[i].t,
        description: s1Titles[i].d,
        category: 'Water Contamination',
        departmentId: wsb._id,
        officerId: oWater._id,
        citizenId: citizens[i % 50]._id,
        location: { lat: 18.9226, lng: 72.8344, address: 'Sector 12, South Mumbai' },
        priority: 'high',
        status: 'assigned',
        officialStatus: 'pending',
        ward: 'Ward 1',
        realityScore: 35,
        realityStatus: 'High Risk',
        createdAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000) // created in past 2.5 days
      });
    }

    // ========================================================
    // SCENARIO 2: ADMINISTRATIVE DELAY ANOMALY (Ward 3)
    // ========================================================
    // 4 complaints assigned to Officer 1 (oWater) pending 16 days. Historical avg is 3 days.
    for (let i = 0; i < 4; i++) {
      complaintsArray.push({
        title: `Pending Sewage Backflow - Ward 3 Block ${String.fromCharCode(65 + i)}`,
        description: `Deep sewerage blockage and overflow onto pavements. Assigned to officer but no resolution for over two weeks.`,
        category: 'Water Contamination',
        departmentId: wsb._id,
        officerId: oWater._id,
        citizenId: citizens[(i + 5) % 50]._id,
        location: { lat: 18.9610, lng: 72.8420, address: `Ward 3, Byculla` },
        priority: 'high',
        status: 'assigned',
        officialStatus: 'pending',
        ward: 'Ward 3',
        realityScore: 28,
        realityStatus: 'High Risk',
        createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) // 16 days ago
      });
    }

    // ========================================================
    // SCENARIO 3: FALSE RESOLUTION DETECTION (Streetlight Cluster)
    // ========================================================
    // Resolved Streetlight Complaint B1 (Citizen reopens)
    const compB1 = {
      title: 'Streetlight not working at Fort Circle',
      description: 'Streetlight pole #45 is completely out. Total darkness.',
      category: 'Electrical Hazard',
      departmentId: eb._id,
      officerId: oElectric._id,
      citizenId: primaryCitizen._id,
      location: { lat: 18.9322, lng: 72.8310, address: 'Flora Fountain, Fort Circle' },
      priority: 'medium',
      status: 'reopened', // citizen disputed resolution
      officialStatus: 'pending',
      ward: 'Ward 2',
      realityScore: 21, // False closure score
      realityStatus: 'High Risk',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // resolved 2 days ago, reopened yesterday
    };
    complaintsArray.push(compB1);

    // Nearby similar complaints logged around the same time
    complaintsArray.push({
      title: 'Complete darkness due to non-functional streetlights near Fort Circle',
      description: 'Dangerous situation. Walkways are dark and unsafe for pedestrians.',
      category: 'Electrical Hazard',
      departmentId: eb._id,
      officerId: oElectric._id,
      citizenId: citizens[12]._id,
      location: { lat: 18.9330, lng: 72.8315, address: 'Flora Fountain, Fort Circle' },
      priority: 'medium',
      status: 'assigned',
      officialStatus: 'pending',
      ward: 'Ward 2',
      realityScore: 25,
      realityStatus: 'High Risk',
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
    });

    complaintsArray.push({
      title: 'Streetlights blinking and going out near Fort Circle',
      description: 'Substation supply issue, flickering repeatedly.',
      category: 'Electrical Hazard',
      departmentId: eb._id,
      officerId: oElectric._id,
      citizenId: citizens[13]._id,
      location: { lat: 18.9318, lng: 72.8305, address: 'Flora Fountain, Fort Circle' },
      priority: 'low',
      status: 'assigned',
      officialStatus: 'pending',
      ward: 'Ward 2',
      realityScore: 30,
      realityStatus: 'High Risk',
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    });

    // ========================================================
    // FILLER DATA: 88 additional randomized complaints to hit exactly 100
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
      const officerIdx = Math.floor(Math.random() * 10);
      const targetOfficerUser = officerUsers[officerIdx];
      const targetOfficerProfile = officers[officerIdx];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const ward = wards[Math.floor(Math.random() * wards.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];

      let dept = mc;
      if (category.includes('Water') || category.includes('Manhole')) dept = wsb;
      else if (category.includes('Electrical') || category.includes('Supply')) dept = eb;
      else if (category.includes('Fire')) dept = fes;
      else if (category.includes('Road')) dept = rid;

      // Seed dates across the previous 60 days
      const daysAgo = Math.floor(Math.random() * 60) + 1; // 1 to 60 days
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      // If resolved, set updatedAt to a few days after creation
      let updatedAt = createdAt;
      if (status === 'resolved') {
        const resolveDays = Math.floor(Math.random() * 5) + 1;
        updatedAt = new Date(createdAt.getTime() + resolveDays * 24 * 60 * 60 * 1000);
      }

      // Reality score modeling: high scores for resolved without issues, low for others
      let realityScore = 50;
      let realityStatus: 'Verified' | 'Needs Verification' | 'High Risk' = 'Needs Verification';

      if (status === 'resolved') {
        realityScore = Math.floor(Math.random() * 20) + 80; // 80 - 100
        realityStatus = 'Verified';
      } else {
        realityScore = Math.floor(Math.random() * 30) + 35; // 35 - 65
        realityStatus = realityScore < 40 ? 'High Risk' : 'Needs Verification';
      }

      complaintsArray.push({
        title: `${category} issue flagged by citizen`,
        description: `Citizen reported a standard ${category.toLowerCase()} grievance at coordinates. Requesting standard department dispatch.`,
        category,
        departmentId: dept._id,
        officerId: targetOfficerUser._id,
        citizenId: citizens[citizenIdx]._id,
        location: { 
          lat: 18.9226 + (Math.random() - 0.5) * 0.05, 
          lng: 72.8344 + (Math.random() - 0.5) * 0.05, 
          address: `Colony Block ${i}, ${ward}, Mumbai` 
        },
        priority,
        status,
        officialStatus: status === 'resolved' ? 'resolved' : 'pending',
        ward,
        realityScore,
        realityStatus,
        createdAt,
        updatedAt
      });
    }

    const seededComplaints = await Complaint.create(complaintsArray);

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

    return NextResponse.json({
      success: true,
      message: 'MongoDB seeded successfully with exactly 100 complaints and the 3 RealityEngine scenarios.',
      statistics: {
        citizens: 50,
        officers: 10,
        departments: 5,
        totalComplaints: seededComplaints.length,
        anomaliesSeeded: [
          'Sector 12 Water Infrastructure Failure Cluster (5 reports)',
          'Ward 3 Administrative Delay Anomaly (4 delayed reports)',
          'Fort Circle Streetlight False Resolution Incident (3 reports)'
        ]
      }
    });
  } catch (error: any) {
    console.error('100 Complaints Seeding Error:', error);
    return NextResponse.json({ error: error.message || 'Seeding Failed' }, { status: 500 });
  }
}
