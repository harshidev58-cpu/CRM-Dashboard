import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { CopilotEngine } from '@/services/CopilotEngine';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const { question } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question parameter is required' }, { status: 400 });
    }

    const answer = await CopilotEngine.queryCopilot(question);

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error('POST /api/copilot error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
