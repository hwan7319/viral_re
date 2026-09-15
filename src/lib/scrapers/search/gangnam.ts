import type { Campaign } from '../../db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { HEADERS, parseDdayToDate, parseCountText, detectCategory, generateRealMission } from '../../scraper-utils';
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected: Campaign[] = [];
const now = new Date();
const encodedKeyword = encodeURIComponent(keyword);
await (async () => {
      try {
        const staticUrl = `https://xn--939au0g4vj8sq.net/cp/?stx=${encodedKeyword}`;
        const staticRes = await axios.get(staticUrl, { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(staticRes.data);
        $('.list_item').each((i, el) => {
          const titleLink = $(el).find('dt.tit a');
          const title = titleLink.text().trim();
          const campaignUrlPath = titleLink.attr('href') || '';
          const campaignUrl = `https://xn--939au0g4vj8sq.net${campaignUrlPath}`;
          
          const subTit = $(el).find('dd.sub_tit').text().trim();
          const description = subTit || title || '상세 제공 혜택 원본 참조';

          let imageUrl = $(el).find('.imgArea img').attr('src') || '';
          if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
          const ddayText = $(el).find('.dday em.day_c').text().trim();
          const endDate = parseDdayToDate(ddayText);
          const platformText = $(el).find('.label em.blog').text().trim().toLowerCase();
          const platform = (platformText.includes('instagram') || platformText.includes('insta')) ? 'instagram' : 'blog';
          const { applyCount, limitCount } = parseCountText($(el).find('.item_info .numb').text().trim());
          const locMatch = title.match(/\[([^\]]+)\]/);
          const location = locMatch ? locMatch[1] : undefined;
          const category = detectCategory(title, description);

          if (title && campaignUrlPath) {
            const urlParams = new URL(campaignUrl).searchParams;
            const cpId = urlParams.get('id') || campaignUrlPath.replace(/[^0-9]/g, '');
            const id = `gn-${cpId}`;
            const mission = generateRealMission(title, platform, category, location);

            collected.push({
              id, title, description, platform, category, location, campaignUrl,
              imageUrl, targetSite: '강남맛집', limitCount, applyCount,
              startDate: now.toISOString().split('T')[0], endDate,
              createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords: `,${keyword},`,
              mission
            });
          }
        });
      } catch (err: any) {
        console.error('[Parallel-Crawl] 강남맛집 failed:', err.message);
      }
    })();
return collected;
}
