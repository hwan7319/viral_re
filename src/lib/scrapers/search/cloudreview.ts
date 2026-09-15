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
        const res = await axios.get('https://cloudreview.co.kr', { headers: HEADERS, timeout: 6000 });
        const $ = cheerio.load(res.data);
        $('a[href*="/campaign/detail/"]').each((i, el) => {
          const href = $(el).attr('href') || '';
          const parent = $(el).closest('div.relative, article, div.campaign-image').parent();
          
          let mainTitle = parent.find('div.text-sm.px-3.pt-3 a, h3').text().trim().replace(/\s+/g, ' ') || $(el).text().trim().replace(/\s+/g, ' ');
          let subDesc = parent.find('div.truncate.pl-1, div.px-3 div.text-xs').text().trim().replace(/\s+/g, ' ');
          subDesc = subDesc.replace(/\d+인\s*모집.*$/g, '').trim();

          const cleanTitle = mainTitle || subDesc || '클라우드리뷰';
          const cleanDesc = (subDesc && subDesc !== mainTitle) ? subDesc : `${cleanTitle.replace(/^\[[^\]]+\]\s*/, '')} 체험 혜택`;
          const fullSearchText = `${cleanTitle} ${cleanDesc}`;

          let img = parent.find('img').attr('data-original') || parent.find('img').attr('data-src') || parent.find('img').attr('src') || '';
          if (img && !img.startsWith('http')) {
            img = img.startsWith('//') ? 'https:' + img : 'https://cloudreview.co.kr' + (img.startsWith('/') ? '' : '/') + img;
          }
          
          const cpIdMatch = href.match(/\/detail\/(\d+)/);
          const cpId = cpIdMatch ? cpIdMatch[1] : '';

          if (cleanTitle && cleanTitle.length > 3 && cpId) {
            // 🔑 [수치 정밀 매칭] 검색어가 지정된 경우, 제목에 검색어가 실제 포함된 공고만 엄격 수집
            if (keyword && !fullSearchText.toLowerCase().includes(keyword.toLowerCase())) {
              return;
            }

            const fullUrl = `https://cloudreview.co.kr/campaign/detail/${cpId}`;
            const category = detectCategory(fullSearchText, fullSearchText);

            collected.push({
              id: `cr-${cpId}`,
              title: cleanTitle,
              description: cleanDesc,
              platform: detectPlatform(fullSearchText, fullSearchText),
              category,
              campaignUrl: fullUrl,
              imageUrl: img || 'https://viral-re.co.kr/icon.png',
              targetSite: '클라우드리뷰',
              limitCount: 0,
              applyCount: 0,
              startDate: now.toISOString().split('T')[0],
              endDate: '',
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            });
          }
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 클라우드리뷰 failed:', err.message);
      }
    })();
return collected;
}
