import type { Campaign } from '../../db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectCategory, detectPlatform } from '../../scraper-utils';
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected: Campaign[] = [];
const now = new Date();
const encodedKeyword = encodeURIComponent(keyword);
await (async () => {
      try {
        const revuUrl = `https://www.revu.net/campaign/search?q=${encodedKeyword}`;
        const revuHeaders = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        };

        const res = await axios.get(revuUrl, { headers: revuHeaders, timeout: 6000 });
        const $ = cheerio.load(res.data);
        const ogImage = $('meta[property="og:image"]').attr('content') || '';

        $('.campaign-list-item, .card-item, .campaign-card, div[class*="campaign"], a[href*="/campaign/"]').each((i, el) => {
          const href = $(el).attr('href') || $(el).find('a').attr('href') || '';
          if (!href || !href.includes('/campaign/')) return;

          const rawTitle = $(el).find('.title, .campaign-title, h3, h4, strong').first().text().trim() || $(el).text().trim().split('\n')[0];
          if (!rawTitle || rawTitle.length < 2) return;

          const cid = href.replace(/[^0-9]/g, '');
          const campaignUrl = href.startsWith('http') ? href : `https://www.revu.net${href}`;
          const imageUrl = $(el).find('img').attr('src') || ogImage || 'https://www.revu.net/assets/img/og-revu.png';
          const benefit = $(el).find('.benefit, .desc, .sub_title').text().trim() || '레뷰 프리미엄 식사권 및 무상 상품 제공';
          const platformText = $(el).find('.sns-ico, .platform, .badge').text().trim();
          const platform = detectPlatform(rawTitle, platformText);
          const category = detectCategory(rawTitle, benefit);

          collected.push({
            id: `revu-live-${cid || i}`,
            title: rawTitle.length > 50 ? rawTitle.slice(0, 50) + '...' : rawTitle,
            description: benefit,
            platform,
            category,
            campaignUrl,
            imageUrl: imageUrl.startsWith('//') ? 'https:' + imageUrl : imageUrl,
            targetSite: '레뷰 (REVU)',
            limitCount: 0,
            applyCount: 0,
            endDate: now.toISOString().split('T')[0],
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            searchKeywords: `,${keyword},`
          });
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 레뷰 (REVU) live scraper:', err.message);
      }
    })();
return collected;
}
