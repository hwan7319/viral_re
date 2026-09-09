import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedCampaign, SiteScraper } from './types';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

export const RingbleScraper: SiteScraper = {
  siteName: '링블',

  async scrapeList(keyword?: string): Promise<ScrapedCampaign[]> {
    const res = await axios.get('https://www.ringble.co.kr', { headers: HEADERS, timeout: 6000 });
    const $ = cheerio.load(res.data);
    const collected: ScrapedCampaign[] = [];
    const now = new Date();

    $('a[href*="detail.php"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const parent = $(el).closest('div, li');
      let rawTitle = $(el).text().trim().replace(/\s+/g, ' ') || parent.text().trim().replace(/\s+/g, ' ');
      if (keyword && !rawTitle.toLowerCase().includes(keyword.toLowerCase())) return;

      let img = $(el).find('img').attr('src') || parent.find('img').attr('src') || '';
      if (img && img.startsWith('//')) img = 'https:' + img;
      if (img && !img.startsWith('http')) img = `https://www.ringble.co.kr${img.startsWith('/') ? '' : '/'}${img}`;

      const numMatch = href.match(/number=(\d+)/);
      const cpId = numMatch ? numMatch[1] : `${i}`;

      if (rawTitle && rawTitle.length > 3) {
        collected.push({
          id: `ringble-${cpId}`,
          title: rawTitle.slice(0, 60),
          description: '', // Force detail scraper enrichment for Ringble
          platform: 'blog',
          category: 'general',
          campaignUrl: href.startsWith('http') ? href : `https://www.ringble.co.kr/${href}`,
          imageUrl: img || 'https://viral-re.co.kr/icon.png',
          targetSite: '링블',
          limitCount: 5,
          applyCount: 0,
          startDate: now.toISOString().split('T')[0],
          endDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
    });

    return collected;
  },

  async scrapeDetailBenefit(url: string): Promise<string | undefined> {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 6000 });
      const $ = cheerio.load(res.data);
      let benefit = '';
      $('td').each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text.includes('제공내역')) {
          const clean = text.replace(/.*제공내역\s*/, '').trim();
          if (clean && (!benefit || clean.length < benefit.length)) {
            benefit = clean;
          }
        }
      });
      if (!benefit) {
        const bodyText = $('body').text().replace(/\s+/g, ' ');
        const match = bodyText.match(/제공내역\s*:?\s*([^가-힣A-Za-z0-9]*[가-힣A-Za-z0-9\s\,\+\(\)\[\]\~\!\@\#\$\%\^\&\*\-\_\=\:\;\.\/\<\>]+?)(?=신청안내|리뷰어|미션|안내사항|구매옵션|원고료|$)/i);
        if (match && match[1]) {
          benefit = match[1].trim().slice(0, 100);
        }
      }
      return benefit || undefined;
    } catch (e) {
      return undefined;
    }
  }
};
