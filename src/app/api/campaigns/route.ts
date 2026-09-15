import { NextRequest, NextResponse, after } from 'next/server';
import { queryCampaigns, getTotalCampaignCount, logSearchQuery } from '@/lib/db';
import { reserveKeywordCrawl, runKeywordCrawl } from '@/lib/crawl-jobs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const search = (params.get('search') || '').trim();
    const limit = Number(params.get('limit') || 60);
    const offset = Number(params.get('offset') || 0);
    if (search.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 300 || !Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ success: false, error: 'Invalid search or pagination' }, { status: 400 });
    const filters = Object.fromEntries(['platform', 'category', 'location', 'targetSite', 'sortBy', 'type'].map(key => [key, params.get(key) || 'all']));
    if (!['all', 'visit', 'delivery'].includes(filters.type) || !['all', 'latest', 'endDate', 'popular'].includes(filters.sortBy)) return NextResponse.json({ success: false, error: 'Invalid filter' }, { status: 400 });
    const campaigns = await queryCampaigns({ ...filters, search });
    // Only the first page can schedule work. Failed/empty searches obey the same cooldown.
    const isCrawlingTriggered = offset === 0 && params.get('crawl') !== 'false' && !!search && reserveKeywordCrawl(search);
    if (isCrawlingTriggered) after(async () => {
      try { await runKeywordCrawl(search); } catch (error) { console.error('Keyword crawl failed', error); }
    });
    if (search && offset === 0 && params.get('crawl') !== 'false') await logSearchQuery(search, campaigns.length > 0);
    const data = campaigns.slice(offset, offset + limit);
    return NextResponse.json({ success: true, totalDBCount: await getTotalCampaignCount(), totalCount: campaigns.length, data, offset, limit, nextOffset: offset + data.length < campaigns.length ? offset + data.length : null, isCrawlingTriggered });
  } catch (error) {
    console.error('Campaign query failed', error);
    return NextResponse.json({ success: false, error: '캠페인 조회에 실패했습니다.' }, { status: 500 });
  }
}
