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
        const url = `https://www.assaview.co.kr/campaign/list.php?search_word=${encodedKeyword}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(res.data);
        $('.item-box').each((i, el) => {
          const title = $(el).find('.item-title').text().trim();
          const campaignUrl = 'https://www.assaview.co.kr' + ($(el).find('a').attr('href') || '');
          const imageUrl = $(el).find('img').attr('src') || '';
          if (title) {
            collected.push({
              id: `as-${i}`, title, description: '아싸뷰 체험단 모집 공고', platform: 'instagram',
              category: detectCategory(title, ''), campaignUrl, imageUrl, targetSite: '아싸뷰',
              limitCount: 0, applyCount: 0, endDate: now.toISOString().split('T')[0],
              createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
            });
          }
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 아싸뷰 failed:', err.message);
      }
    })();
return collected;
}
