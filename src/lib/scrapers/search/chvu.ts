import type { Campaign } from '../../db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { HEADERS, detectCategory } from '../../scraper-utils';
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected: Campaign[] = [];
const now = new Date();
const encodedKeyword = encodeURIComponent(keyword);
await (async () => {
      try {
        const url = `https://chvu.co.kr/campaign/list.php?search_word=${encodedKeyword}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(res.data);
        $('.campaign-list-item').each((i, el) => {
          const title = $(el).find('.c-title').text().trim();
          const campaignUrl = 'https://chvu.co.kr' + ($(el).find('a').attr('href') || '');
          const imageUrl = $(el).find('.thumb img').attr('src') || '';
          if (title && campaignUrl) {
            collected.push({
              id: `cv-${i}-${Math.random().toString(36).substr(2, 5)}`,
              title, description: '체험뷰 블로그/인스타 리뷰단 모집', platform: 'blog',
              category: detectCategory(title, ''), campaignUrl, imageUrl, targetSite: '체험뷰',
              limitCount: 0, applyCount: 0, endDate: now.toISOString().split('T')[0],
              createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
            });
          }
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 체험뷰 failed:', err.message);
      }
    })();
return collected;
}
