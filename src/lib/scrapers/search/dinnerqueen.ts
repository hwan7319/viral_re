import type { Campaign } from '../../db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { scrapeDetailBenefit } from '../../detail-scraper';
import { HEADERS, parseDdayToDate, parseCountText, detectCategory, detectPlatform } from '../../scraper-utils';
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected: Campaign[] = [];
const now = new Date();
const encodedKeyword = encodeURIComponent(keyword);
await (async () => {
      try {
        const dqItems: any[] = [];
        const seenIds = new Set<string>();
        const listUrls = ['new', 'hot'].map(order => `https://dinnerqueen.net/taste?query=${encodedKeyword}&order=${order}`);

        for (const dqUrl of listUrls) {
          const response = await axios.get(dqUrl, { headers: HEADERS, timeout: 5000 });
          const $ = cheerio.load(response.data);
          $('.qz-dq-card').each((index, element) => {
          const linkEl = $(element).find('.qz-dq-card__link');
          const rawTitle = linkEl.attr('title') || '';
          const title = rawTitle.replace(/신청하기$/, '').replace(/보러가기$/, '').trim();
          const campaignUrl = linkEl.attr('href') || '';
          const imgEl = $(element).find('.qz-dq-card__link__img img');
          const imageUrl = imgEl.attr('src') || '';
          // Current cards publish the application deadline as "N일 남음" in
          // the countdown row. The old selector targeted a retired layout.
          const ddayText = $(element).find('.qz-dq-card__countdown-row > p strong').first().text().trim()
            || $(element).find('.layer-primary p.qz-caption-kr--line strong').first().text().trim();
          const endDate = parseDdayToDate(ddayText);
          const badgesText = $(element).find('.qz-wrap').text();
          const platform = detectPlatform(title, badgesText);
          const applyText = $(element).find('.apply_badge .qz-caption-kr').text().trim()
            || $(element).text().replace(/\s+/g, ' ').trim();
          const { applyCount, limitCount } = parseCountText(applyText);
          
          let location = undefined;
          if (!badgesText.includes('배송')) {
            const locMatch = title.match(/\[([^\]]+)\]/);
            location = locMatch ? locMatch[1] : undefined;
          }

          const category = detectCategory(title, badgesText);

          if (title && campaignUrl) {
            const fullUrl = campaignUrl.startsWith('http') ? campaignUrl : `https://dinnerqueen.net${campaignUrl}`;
            const dqId = fullUrl.split('/').pop() || fullUrl.replace(/[^0-9]/g, '');
            const id = `dq-${dqId}`;
            if (seenIds.has(id)) return;
            seenIds.add(id);

            const descText = $(element).find('.qz-caption-kr.color-placeholder.ellipsis').text().trim().replace(/\s+/g, ' ');
            const cleanDesc = (descText && descText !== title) ? descText : title.replace(/^\[[^\]]+\]\s*/, '').trim() + ' 체험 혜택';

            dqItems.push({
              id, title, description: cleanDesc, platform, category, location, campaignUrl: fullUrl,
              imageUrl, targetSite: '디너의여왕', limitCount, applyCount,
              startDate: now.toISOString().split('T')[0], endDate,
              createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords: `,${keyword},`
            });
          }
          });
        }

        // Upstream becomes unstable when every detail page is requested at
        // once. Small parallel batches keep the list response predictable.
        for (let offset = 0; offset < dqItems.length; offset += 5) {
          const chunk = dqItems.slice(offset, offset + 5);
          await Promise.all(chunk.map(async (item) => {
            const realBenefit = await scrapeDetailBenefit(item.campaignUrl, '디너의여왕');
            if (realBenefit && realBenefit !== item.title) {
              item.description = realBenefit;
            }
          }));
          collected.push(...chunk);
        }
      } catch (err: any) {
        console.error('[Parallel-Crawl] 디너의여왕 failed:', err.message);
      }
    })();
return collected;
}
