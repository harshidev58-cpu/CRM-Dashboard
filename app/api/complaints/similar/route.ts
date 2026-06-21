import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { SimilarityService } from '@/services/SimilarityService';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const complaintId = searchParams.get('complaintId') || searchParams.get('id');

    if (!complaintId) {
      return NextResponse.json({ error: 'Missing complaintId query parameter' }, { status: 400 });
    }

    const similar = await SimilarityService.findSimilarComplaints(complaintId);
    
    return NextResponse.json(similar);
  } catch (error: any) {
    console.error('GET /api/complaints/similar error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
