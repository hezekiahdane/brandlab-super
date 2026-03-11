import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: In future milestones, this will:
  // 1. Fetch analytics data from Ayrshare for each connected account
  // 2. Compute per-workspace engagement scores per platform/day/hour
  // 3. Upsert results into heatmap_cache
  // For now, global defaults are seeded via migration.

  console.log('[cron] refresh-heatmap: stub executed at', new Date().toISOString());

  return NextResponse.json({ success: true, message: 'Heatmap refresh stub — no-op' });
}
