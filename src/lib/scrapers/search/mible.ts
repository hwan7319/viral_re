import type { Campaign } from '../../db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { HEADERS, parseRemainDaysToDate, detectCategory, detectPlatform } from '../../scraper-utils';
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected: Campaign[] = [];
const now = new Date();
const encodedKeyword = encodeURIComponent(keyword);
await (async () => {
      try {
        const res = await axios.get('https://www.mrblog.net', { headers: HEADERS, timeout: 6000 });
        const $ = cheerio.load(res.data);
        $('a').each((i, el) => {
          const href = $(el).attr('href') || '';
          const rawText = $(el).text().trim().replace(/\s+/g, ' ');
          const img = $(el).find('img').attr('src') || $(el).parent().find('img').attr('src') || '';

          if (href.includes('/campaigns/') && rawText.length > 5) {
            if (rawText.includes('바로가기') || href.includes('search?') || href.includes('query=')) return;
            if (keyword && !rawText.toLowerCase().includes(keyword.toLowerCase())) {
              return;
            }

            const fullUrl = href.startsWith('http') ? href : `https://www.mrblog.net${href.startsWith('/') ? '' : '/'}${href}`;
            const cpId = fullUrl.split('/campaigns/')[1] || '';
            if (!cpId || !/^\d+$/.test(cpId.trim())) return;
            const id = `mb-${cpId}`;

            // 지원수 / 모집수 파싱
            const applyMatch = rawText.match(/신청\s*([0-9,]+)명/);
            const limitMatch = rawText.match(/모집\s*([0-9,]+)명/);
            const applyCount = applyMatch ? parseInt(applyMatch[1].replace(/,/g, ''), 10) : 0;
            const limitCount = limitMatch ? parseInt(limitMatch[1].replace(/,/g, ''), 10) : 0;

            // 남은일수 파싱
            const daysMatch = rawText.match(/(\d+)\s*일\s*남음/);
            const remainDays = daysMatch ? parseInt(daysMatch[1], 10) : 7;
            const endDate = parseRemainDaysToDate(remainDays);

            let clean = rawText
              .replace(/(?:오늘\s*마감|\d+\s*일\s*남음|D-Day|\d+\s*시간\s*남음)?\s*(?:신청|지원)\s*\d+.*$/gi, '')
              .replace(/D-Day/gi, '')
              .replace(/\d+\s*일\s*남음/gi, '')
              .replace(/업체\s*진행/gi, '')
              .replace(/\s+/g, ' ')
              .trim();

            // 제목과 제공혜택 정밀 분리
            let title = clean;
            let description = clean;
            const tokens = clean.split(' ');
            if (tokens.length >= 4) {
              title = tokens.slice(0, 3).join(' ');
              description = tokens.slice(3).join(' ');
            }

            const category = detectCategory(clean, clean);
            const locMatch = title.match(/\[([^\]]+)\]/) || title.match(/^([가-힣]+\s+[가-힣]+)/);
            const location = locMatch ? locMatch[1] : undefined;

            collected.push({
              id, title, description, platform: detectPlatform(clean, clean), category, location, campaignUrl: fullUrl,
              imageUrl: img || 'https://viral-re.co.kr/icon.png', targetSite: '미블', limitCount, applyCount,
              startDate: now.toISOString().split('T')[0], endDate,
              createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
            });
          }
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 미블 (Mible) failed:', err.message);
      }
    })();
return collected;
}
