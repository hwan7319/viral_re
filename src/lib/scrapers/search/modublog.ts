import type { Campaign } from '../../db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { HEADERS, detectCategory, detectPlatform } from '../../scraper-utils';
import { deadlineFromText } from '../../campaign-values';
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected: Campaign[] = [];
const now = new Date();
const encodedKeyword = encodeURIComponent(keyword);
await (async () => {
      try {
        const seenMoblIds = new Set<string>();
        for (let page = 1; page <= 5; page++) {
          const pageUrl = `https://www.modublog.co.kr/product/?page=${page}`;
          try {
            const res = await axios.get(pageUrl, { headers: HEADERS, timeout: 6000 });
            const $ = cheerio.load(res.data);
            const boxes = $('.c_box');
            if (boxes.length === 0) break;

            boxes.each((_, el) => {
              const href = $(el).find('a[href*="/product/"]').attr('href') || '';
              const numMatch = href.match(/\/product\/(\d+)/);
              if (!numMatch) return;
              const cpId = numMatch[1];
              if (seenMoblIds.has(cpId)) return;

              const title = $(el).find('.c_title a').text().trim().replace(/\s+/g, ' ');
              const sub = $(el).find('.pr_subject_sub').text().trim().replace(/\s+/g, ' ');
              const platformText = $(el).find('.btn_ca').first().text().trim();
              const cleanTitle = title || sub || '모블 체험단';
              const cleanDesc = sub || title || cleanTitle;
              const fullSearchText = `${cleanTitle} ${cleanDesc}`;

              if (keyword && !fullSearchText.toLowerCase().includes(keyword.toLowerCase())) return;

              seenMoblIds.add(cpId);
              let img = $(el).find('img').attr('src') || $(el).find('img').attr('data-original') || $(el).find('img').attr('data-src') || '';
              if (img && img.startsWith('//')) img = 'https:' + img;
              if (img && !img.startsWith('http')) img = `https://www.modublog.co.kr${img.startsWith('/') ? '' : '/'}${img}`;

              const recruitText = $(el).find('.recruit').text().replace(/\s+/g, '');
              const recruitMatch = recruitText.match(/신청(\d+)\/(\d+)/);
              const applyCount = recruitMatch ? parseInt(recruitMatch[1], 10) : 0;
              const limitCount = recruitMatch ? parseInt(recruitMatch[2], 10) : 0;
              const endDate = deadlineFromText($(el).find('.deadline').text().trim());

              collected.push({
                id: `modublog-${cpId}`, title: cleanTitle.slice(0, 80), description: cleanDesc,
                platform: detectPlatform(platformText, fullSearchText), category: detectCategory(fullSearchText, fullSearchText),
                campaignUrl: `https://www.modublog.co.kr/product/${cpId}`, imageUrl: img || 'https://viral-re.co.kr/icon.png',
                targetSite: '모블', limitCount, applyCount,
                startDate: now.toISOString().split('T')[0], endDate, createdAt: now.toISOString(), updatedAt: now.toISOString()
              });
            });
          } catch (e) {
            break;
          }
        }
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 모블 (모두의블로그) failed:', err.message);
      }
    })();
return collected;
}
