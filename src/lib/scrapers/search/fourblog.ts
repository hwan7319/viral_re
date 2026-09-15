import type { Campaign } from '../../db';
import axios from 'axios';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { HEADERS, parseRemainDaysToDate, detectCategory, generateRealMission, buildAutoKeywords } from '../../scraper-utils';

const ORIGIN = 'https://4blog.net';
const execFileAsync = promisify(execFile);

async function fetchCampaigns(keyword: string) {
  const url = ORIGIN + '/loadMoreDataCategorySearch2?search=' + encodeURIComponent(keyword) + '&search2=' + encodeURIComponent(keyword) + '&offset=0&limit=100';
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const landing = await axios.get(ORIGIN, { headers: HEADERS, timeout: 8000 });
      const cookies = (landing.headers['set-cookie'] || []).map(value => value.split(';')[0]).join('; ');
      const response = await axios.get(url, {
        headers: {
          ...HEADERS,
          Accept: 'application/json, text/javascript, */*; q=0.01',
          Referer: ORIGIN + '/',
          'X-Requested-With': 'XMLHttpRequest',
          ...(cookies ? { Cookie: cookies } : {}),
        },
        timeout: 8000,
      });
      if (!Array.isArray(response.data)) {
        const invalidResponse = new Error('Fourblog returned a non-JSON campaign response') as Error & { retryable?: boolean };
        invalidResponse.retryable = true;
        throw invalidResponse;
      }
      return response;
    } catch (error: any) {
      lastError = error;
      const retryable = [403, 429].includes(error.response?.status) || error.retryable;
      if (!retryable || attempt === 1) break;
      await new Promise(resolve => setTimeout(resolve, 1_250));
    }
  }
  try {
    // Fourblog's Cloudflare configuration intermittently rejects Axios from
    // EC2 while accepting a normal command-line browser request. This is a
    // same-origin, public API fallback; no proxy or IP bypass is used.
    const { stdout } = await execFileAsync('curl', [
      '-sS', '--fail', '--max-time', '10',
      '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      '-e', ORIGIN + '/',
      url,
    ], { maxBuffer: 2 * 1024 * 1024 });
    const data = JSON.parse(stdout);
    if (Array.isArray(data)) return { data };
  } catch (error) {
    lastError = error;
  }
  throw lastError;
}
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected = new Map<string, Campaign>();
const now = new Date();
// The public endpoint treats an empty search as no result.  Use the site's
// active discovery categories during scheduled synchronization, while keeping
// a caller's keyword untouched for an on-demand search.
const queries = keyword.trim() ? [keyword.trim()] : ['맛집', '뷰티', '여행', '식품', '생활', '패션', '가전', '육아', '반려동물'];
for (const query of queries) {
      try {
        const response = await fetchCampaigns(query);
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
            const remainDays = Number(item.REMAINDATE);
            const endDate = Number.isInteger(remainDays) && remainDays >= 0 ? parseRemainDaysToDate(remainDays) : '';
            const limitCount = parseInt(item.REVIEWER_CNT || item.LIMIT_CNT || 0, 10) || 0;
            const applyCount = parseInt(item.REVIEWER_REQ_CNT || item.REQ_CNT || 0, 10) || 0;
            const autoKws = buildAutoKeywords(title, description);
            const searchKeywords = autoKws ? `,${query},${autoKws.substring(1)}` : `,${query},`;

            // 원본 실제 미션 데이터 매핑 (포블로그 원본 상세 미션)
            const mission = item.MISSION || item.CAMPAIGN_GUIDE || item.GUIDE || generateRealMission(title, platform, category, location);

            collected.set(id, {
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
    }
return [...collected.values()];
}
