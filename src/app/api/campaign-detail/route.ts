import { NextRequest, NextResponse } from 'next/server';
import { scrapeDetailMission, scrapeDetailBenefit, scrapeDetailCounts } from '@/lib/detail-scraper';
import { getDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const targetSite = searchParams.get('targetSite') || '';
    const campaignId = searchParams.get('id');
    const title = searchParams.get('title') || '';

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL parameter is required' }, { status: 400 });
    }

    const [mission, realBenefit, counts] = await Promise.all([
      scrapeDetailMission(url, targetSite),
      scrapeDetailBenefit(url, targetSite),
      scrapeDetailCounts(url, targetSite, title)
    ]);

    // 🔑 DB 실시간 백그라운드 동기화 (Sync Back to DB - mission, description, applyCount, limitCount 전수 수복)
    if (campaignId) {
      try {
        const db = await getDB();
        if (mission) {
          await db.run('UPDATE campaigns SET mission = ? WHERE id = ?', [mission, campaignId]);
        }
        if (realBenefit) {
          await db.run('UPDATE campaigns SET description = ? WHERE id = ?', [realBenefit, campaignId]);
        }
        if (counts.applyCount !== undefined) {
          await db.run('UPDATE campaigns SET applyCount = ? WHERE id = ?', [counts.applyCount, campaignId]);
        }
        if (counts.limitCount !== undefined) {
          await db.run('UPDATE campaigns SET limitCount = ? WHERE id = ?', [counts.limitCount, campaignId]);
        }
      } catch (dbErr) {}
    }

    return NextResponse.json({
      success: true,
      mission: mission || null,
      realBenefit: realBenefit || null,
      applyCount: counts.applyCount,
      limitCount: counts.limitCount
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
