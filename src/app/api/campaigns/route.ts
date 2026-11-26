import { NextRequest, NextResponse, after } from 'next/server';
import { filterValues, queryCampaigns, getTotalCampaignCount, logSearchQuery } from '@/lib/db';
import { cancelFilterCrawl, getKeywordCrawlStatus, hasDetailedFilters, planFilterCrawl, reserveFilterCrawl, reserveKeywordCrawl, runFilterCrawl, runKeywordCrawl } from '@/lib/crawl-jobs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const search = (params.get('search') || '').trim();
    const limit = Number(params.get('limit') || 60);
    const offset = Number(params.get('offset') || 0);
    if (search.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 300 || !Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ success: false, error: 'Invalid search or pagination' }, { status: 400 });
    const filters = Object.fromEntries(['platform', 'category', 'location', 'targetSite', 'sortBy', 'type'].map(key => [key, key === 'sortBy' ? (params.get(key) || 'all') : params.getAll(key)]));
    const selectedTypes = filterValues(filters.type);
    if (selectedTypes.some(type => !['visit', 'delivery'].includes(type)) || !['all', 'latest', 'endDate', 'popular'].includes(filters.sortBy as string)) return NextResponse.json({ success: false, error: 'Invalid filter' }, { status: 400 });
    // Long-running browser polling only needs the small job record; avoid
    // repeatedly running a campaign query until source collection is done.
    if (params.get('status') === 'crawl' && search) {
      return NextResponse.json({ success: true, crawlStatus: getKeywordCrawlStatus(search) });
    }
    const campaigns = await queryCampaigns({ ...filters, search });
    // Only the first page can schedule work. Failed/empty searches obey the same cooldown.
    const canScheduleCrawl = offset === 0 && params.get('crawl') !== 'false';
    const isKeywordCrawl = canScheduleCrawl && !!search && reserveKeywordCrawl(search);
    let filterCrawlSites: string[] = [];
    const isFilterCrawl = !isKeywordCrawl && canScheduleCrawl && !search && hasDetailedFilters(filters) && reserveFilterCrawl(filters);
    if (isFilterCrawl) {
      try {
        filterCrawlSites = await planFilterCrawl(filters, campaigns);
      } catch (error) {
        cancelFilterCrawl(filters);
        throw error;
      }
      // Nothing is stale enough to collect, so do not consume a condition
      // cooldown or leave the shared crawl lock held.
      if (!filterCrawlSites.length) cancelFilterCrawl(filters);
    }
    const isCrawlingTriggered = isKeywordCrawl || (isFilterCrawl && filterCrawlSites.length > 0);
    if (isCrawlingTriggered) after(async () => {
      try {
        if (isKeywordCrawl) await runKeywordCrawl(search);
        else await runFilterCrawl(filters, filterCrawlSites);
      } catch (error) { console.error('On-demand crawl failed', error); }
    });
    if (search && offset === 0 && params.get('crawl') !== 'false') await logSearchQuery(search, campaigns.length > 0);
    const data = campaigns.slice(offset, offset + limit);
    return NextResponse.json({
      success: true,
      totalDBCount: await getTotalCampaignCount(),
      totalCount: campaigns.length,
      data,
      offset,
      limit,
      nextOffset: offset + data.length < campaigns.length ? offset + data.length : null,
      isCrawlingTriggered,
      // The initial response is intentionally fast and may be served before
      // source collection finishes. Clients use this state to refresh once the
      // exact-keyword crawl has committed its new rows.
      crawlStatus: search ? getKeywordCrawlStatus(search) : null,
    });
  } catch (error) {
    console.error('Campaign query failed', error);
    return NextResponse.json({ success: false, error: '캠페인 조회에 실패했습니다.' }, { status: 500 });
  }
}
