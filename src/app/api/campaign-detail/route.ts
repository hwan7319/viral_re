import { NextRequest, NextResponse } from 'next/server';
import { scrapeDetailMission, scrapeDetailBenefit } from '@/lib/detail-scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const targetSite = searchParams.get('targetSite') || '';

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL parameter is required' }, { status: 400 });
    }

    const [mission, realBenefit] = await Promise.all([
      scrapeDetailMission(url, targetSite),
      scrapeDetailBenefit(url, targetSite)
    ]);

    return NextResponse.json({
      success: true,
      mission: mission || null,
      realBenefit: realBenefit || null
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
