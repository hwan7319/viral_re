import type { Campaign } from '../../db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { HEADERS, detectCategory, detectPlatform } from '../../scraper-utils';
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected: Campaign[] = [];
const now = new Date();
const encodedKeyword = encodeURIComponent(keyword);
await (async () => {
      try {
        const url = `https://www.ringble.co.kr/g5/bbs/board.php?bo_table=map&sfl=wr_subject%7Cwr_content&stx=${encodedKeyword}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(res.data);
        $('.gallery_list li').each((i, el) => {
          const title = $(el).find('.subject_area').text().trim();
          const campaignUrl = $(el).find('a').attr('href') || '';
          const imageUrl = $(el).find('.img_area img').attr('src') || '';
          const description = $(el).find('.desc_area').text().trim() || '상세 제공 원본 참조';
          if (title && campaignUrl) {
            collected.push({
              id: `rb-${i}-${Math.random().toString(36).substr(2, 5)}`,
              title, description, platform: detectPlatform(title, description), category: detectCategory(title, description),
              campaignUrl, imageUrl, targetSite: '링블', limitCount: 0, applyCount: 0,
              endDate: now.toISOString().split('T')[0], createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords: `,${keyword},`
            });
          }
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 링블 failed:', err.message);
      }
    })();
return collected;
}
