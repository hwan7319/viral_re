import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedCampaign, SiteScraper } from './types';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

export const CloudReviewScraper: SiteScraper = {
  siteName: '클라우드리뷰',

  async scrapeList(keyword?: string): Promise<ScrapedCampaign[]> {
    const res = await axios.get('https://cloudreview.co.kr', { headers: HEADERS, timeout: 6000 });
    const $ = cheerio.load(res.data);
    const collected: ScrapedCampaign[] = [];
    const now = new Date();

    $('a[href*="/campaign/detail/"]').each((index, element) => {
      const href = $(element).attr('href') || '';
      const parent = $(element).closest('div.relative, article, div.campaign-image').parent();
      
      let mainTitle = parent.find('div.text-sm.px-3.pt-3 a, h3').text().trim().replace(/\s+/g, ' ') || $(element).text().trim().replace(/\s+/g, ' ');
      let subDesc = parent.find('div.truncate.pl-1, div.px-3 div.text-xs').text().trim().replace(/\s+/g, ' ');
      subDesc = subDesc.replace(/\d+인\s*모집.*$/g, '').trim();

      const cleanTitle = mainTitle || subDesc || '클라우드리뷰';
      const cleanDesc = (subDesc && subDesc !== mainTitle) ? subDesc : '';
      const fullSearchText = `${cleanTitle} ${cleanDesc}`;

      let img = parent.find('img').attr('data-original') || parent.find('img').attr('data-src') || parent.find('img').attr('src') || '';
      if (img && !img.startsWith('http')) {
        img = img.startsWith('//') ? 'https:' + img : 'https://cloudreview.co.kr' + (img.startsWith('/') ? '' : '/') + img;
      }
      const cpIdMatch = href.match(/\/detail\/(\d+)/);
      const cpId = cpIdMatch ? cpIdMatch[1] : '';

      if (cleanTitle && cleanTitle.length > 3 && cpId) {
        if (keyword && !fullSearchText.toLowerCase().includes(keyword.toLowerCase())) return;

        const fullUrl = `https://cloudreview.co.kr/campaign/detail/${cpId}`;

        collected.push({
          id: `cr-${cpId}`,
          title: cleanTitle,
          description: cleanDesc,
          platform: 'blog',
          category: 'general',
          campaignUrl: fullUrl,
          imageUrl: img || 'https://viral-re.co.kr/icon.png',
          targetSite: '클라우드리뷰',
          limitCount: 10,
          applyCount: 0,
          startDate: now.toISOString().split('T')[0],
          endDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
    });

    return collected;
  }
};
