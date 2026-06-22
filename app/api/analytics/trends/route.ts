import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { Complaint } from '@/models/Complaint';
import { generateAIRecommendations } from '@/lib/recommendations';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const trends = [];
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Calculate metrics for 4 weekly buckets
    for (let i = 0; i < 4; i++) {
      const start = new Date(now - (i + 1) * oneWeekMs);
      const end = new Date(now - i * oneWeekMs);

      const total = await Complaint.countDocuments({
        createdAt: { $gte: start, $lt: end }
      });
      const resolved = await Complaint.countDocuments({
        createdAt: { $gte: start, $lt: end },
        status: 'resolved'
      });
      const verified = await Complaint.countDocuments({
        createdAt: { $gte: start, $lt: end },
        status: 'resolved',
        realityStatus: 'Verified'
      });

      const officialRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
      const verifiedRate = total > 0 ? Math.round((verified / total) * 100) : 0;
      const realityGap = Math.max(0, officialRate - verifiedRate);

      trends.unshift({
        label: `Wk -${i}`,
        period: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        total,
        officialRate,
        verifiedRate,
        realityGap
      });
    }

    // Determine trend status (comparing latest week vs previous week)
    const latestGap = trends[3].realityGap;
    const prevGap = trends[2].realityGap;

    let direction: 'Improving' | 'Stable' | 'Worsening' = 'Stable';
    if (latestGap < prevGap) {
      direction = 'Improving';
    } else if (latestGap > prevGap) {
      direction = 'Worsening';
    }

    // Dynamic AI Recommendations
    const recommendations = await generateAIRecommendations();

    return NextResponse.json({
      success: true,
      trends,
      direction,
      latestGap,
      previousGap: prevGap,
      recommendations
    });
  } catch (error: any) {
    console.error('Error fetching trend analytics:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch trends' }, { status: 500 });
  }
}
