import type { Campaign } from '../../db';
import axios from 'axios';
import { HEADERS, parseRemainDaysToDate, detectCategory, generateRealMission, buildAutoKeywords } from '../../scraper-utils';
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected: Campaign[] = [];
const now = new Date();
const encodedKeyword = encodeURIComponent(keyword);
await (async () => {
      try {
        const pbUrl = `https://4blog.net/loadMoreDataCategorySearch2?search=${encodedKeyword}&search2=${encodedKeyword}&offset=0&limit=30`;
        const response = await axios.get(pbUrl, { headers: HEADERS, timeout: 5000 });
        if (Array.isArray(response.data)) {
          response.data.forEach((item: any) => {
            const id = `pb-${item.CID}`;
            const title = (item.LOCATION_NM || '') + ' ' + (item.CAMPAIGN_NM || '');
            const description = item.REVIEWER_BENEFIT || '상세정보 원본 참조';
            const platform = (item.CATEGORY || '').toLowerCase().includes('instar') ? 'instagram' : 'blog';
            const category = detectCategory(title, description);
            const location = item.LOCATION_NM ? item.LOCATION_NM.replace(/[\[\]]/g, '') : undefined;
            const campaignUrl = `https://4blog.net/campaign/${item.CID}/`;
            const imageUrl = `https://d3oxv6xcx9d0j1.cloudfront.net/public/pr/${item.PRID}/thumbnail/${item.IMGKEY}`;
            const endDate = parseRemainDaysToDate(item.REMAINDATE || 7);
            const limitCount = parseInt(item.REVIEWER_CNT || item.LIMIT_CNT || 0, 10) || 0;
            const applyCount = parseInt(item.REVIEWER_REQ_CNT || item.REQ_CNT || 0, 10) || 0;
            const autoKws = buildAutoKeywords(title, description);
            const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

            // 원본 실제 미션 데이터 매핑 (포블로그 원본 상세 미션)
            const mission = item.MISSION || item.CAMPAIGN_GUIDE || item.GUIDE || generateRealMission(title, platform, category, location);

            collected.push({
              id, title, description, platform, category, location, campaignUrl,
              imageUrl, targetSite: '포블로그', limitCount, applyCount,
              startDate: now.toISOString().split('T')[0], endDate,
              createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords,
              mission
            });
          });
        }
      } catch (err: any) {
        console.error('[Parallel-Crawl] 포블로그 failed:', err.message);
      }
    })();
return collected;
}
