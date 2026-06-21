import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { BriefService } from '@/services/BriefService';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const brief = await BriefService.generateDailyBrief();
    return NextResponse.json(brief);
  } catch (error: any) {
    console.error('GET /api/brief error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
