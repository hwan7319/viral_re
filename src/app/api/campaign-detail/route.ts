import { NextRequest, NextResponse } from 'next/server';
import { scrapeDetailMission, scrapeDetailBenefit } from '@/lib/detail-scraper';
import { getDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const targetSite = searchParams.get('targetSite') || '';
    const campaignId = searchParams.get('id');

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL parameter is required' }, { status: 400 });
    }

    const [mission, realBenefit] = await Promise.all([
      scrapeDetailMission(url, targetSite),
      scrapeDetailBenefit(url, targetSite)
    ]);

    // 🔑 DB 실시간 백그라운드 동기화 (Sync Back to DB)
    if ((mission || realBenefit) && campaignId) {
      try {
        const db = await getDB();
        const combinedText = ((mission || '') + ' ' + (realBenefit || '')).toLowerCase();
        let correctedPlatform: 'blog' | 'instagram' | 'youtube' | 'etc' | undefined = undefined;
        if (combinedText.includes('릴스') || combinedText.includes('인스타') || combinedText.includes('instagram') || combinedText.includes('피드')) {
          correctedPlatform = 'instagram';
        }

        if (correctedPlatform) {
          await db.run('UPDATE campaigns SET platform = ? WHERE id = ?', [correctedPlatform, campaignId]);
        }
        if (mission) {
          await db.run('UPDATE campaigns SET mission = ? WHERE id = ?', [mission, campaignId]);
        }
        if (realBenefit) {
          await db.run('UPDATE campaigns SET description = ? WHERE id = ?', [realBenefit, campaignId]);
        }
      } catch (dbErr) {}
    }

    return NextResponse.json({
      success: true,
      mission: mission || null,
      realBenefit: realBenefit || null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
