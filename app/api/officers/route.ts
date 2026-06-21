import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Officer } from '@/models/Officer';
import { Complaint } from '@/models/Complaint';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const officers = await Officer.find()
      .populate('userId', 'name email')
      .populate('departmentId');

    // Attach current active workload count dynamically
    const officersWithWorkload = await Promise.all(
      officers.map(async (off) => {
        const activeCount = await Complaint.countDocuments({
          officerId: off.userId,
          status: { $in: ['assigned', 'in_progress'] }
        });
        const doc = off.toObject();
        return {
          ...doc,
          activeWorkload: activeCount
        };
      })
    );

    return NextResponse.json(officersWithWorkload);
  } catch (error: any) {
    console.error('GET /api/officers error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
