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
        const ringbleCats = [829, 832, 1015, 834];
        for (const cat of ringbleCats) {
          for (let start = 1; start <= 5; start++) {
            try {
              const url = `https://www.ringble.co.kr/category.php?category=${cat}&start=${start}`;
              const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
              const $ = cheerio.load(res.data);
              const itemsMap = new Map<string, any>();

              $('a[href*="detail.php"]').each((_, el) => {
                const href = $(el).attr('href') || '';
                const numMatch = href.match(/number=(\d+)/);
                if (!numMatch) return;
                const cpId = numMatch[1];
                const id = `ringble-${cpId}`;
                if (collected.some(c => c.id === id)) return;

                if (!itemsMap.has(id)) {
                  itemsMap.set(id, {
                    id,
                    title: '',
                    imageUrl: '',
                    campaignUrl: href.startsWith('http') ? href : `https://www.ringble.co.kr/${href}`,
                    targetSite: '링블',
                    limitCount: 0,
                    applyCount: 0
                  });
                }

                const item = itemsMap.get(id);

                const containerText = $(el).parents('table').first().text();
                const countMatch = containerText.match(/신청\s*([\d,]+)\s*\/\s*모집\s*([\d,]+)/i);
                if (countMatch) {
                  item.applyCount = parseInt(countMatch[1].replace(/,/g, ''), 10);
                  item.limitCount = parseInt(countMatch[2].replace(/,/g, ''), 10);
                }

                const imgInside = $(el).find('img').attr('src');
                if (imgInside) {
                  let img = imgInside;
                  if (img.startsWith('//')) img = 'https:' + img;
                  if (!img.startsWith('http')) img = `https://www.ringble.co.kr${img.startsWith('/') ? '' : '/'}${img}`;
                  img = img.replace(/\/+\.\//g, '/');
                  item.imageUrl = img;
                }

                const text = $(el).text().trim();
                if (text && text.length > 2 && !/\d+일\s*남음|D-Day|신청|모집/.test(text)) {
                  let cleanTitle = text
                    .replace(/^블로그\s*/gi, '')
                    .replace(/(?:오늘\s*마감|\d+\s*일\s*남음|D-Day|D-\d+|\d+\s*시간\s*남음)?\s*신청\s*\d+\s*(?:명)?\s*[\/\,\~]\s*모집\s*\d+\s*(?:명)?/gi, '')
                    .replace(/\s*(?:신청|지원)\s*\d+\s*(?:명)?\s*[\/\,\~]\s*모집\s*\d+\s*(?:명)?/gi, '')
                    .replace(/\s*(?:신청|지원)\s*\d+\s*(?:명)?/gi, '')
                    .replace(/(?:오늘\s*마감|\d+\s*일\s*남음|D-Day)\s*/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                  if (cleanTitle.length > item.title.length) {
                    item.title = cleanTitle.slice(0, 60);
                    item.description = cleanTitle;
                    item.platform = detectPlatform(cleanTitle, cleanTitle);
                    item.category = detectCategory(cleanTitle, cleanTitle);
                  }
                }
              });

              if (itemsMap.size === 0) break;

              itemsMap.forEach(item => {
                if (item.title && item.title.length > 2) {
                  collected.push({
                    ...item,
                    startDate: now.toISOString().split('T')[0],
                    endDate: '',
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString()
                  });
                }
              });
            } catch (e) { break; }
          }
        }
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 링블 failed:', err.message);
      }
    })();
return collected;
}
