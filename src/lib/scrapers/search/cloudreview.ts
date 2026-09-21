import type { Campaign } from '../../db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { HEADERS, detectCategory, detectPlatform } from '../../scraper-utils';

type CloudReviewDetail = Pick<Campaign, 'endDate' | 'applyCount' | 'limitCount' | 'platform'>;

export function parseCloudReviewDetail(text: string, fallbackPlatform: Campaign['platform']): CloudReviewDetail {
  const $ = cheerio.load(text);
  $('script, style, noscript').remove();
  const normalized = $('body').text().replace(/\s+/g, ' ').trim();
  const period = normalized.match(/모집\s*기간\s*(?:20)?(\d{2})[.년\-/\s]+(\d{1,2})[.월\-/\s]+(\d{1,2})\s*(?:일)?\s*[~～-]\s*(?:20)?(\d{2})[.년\-/\s]+(\d{1,2})[.월\-/\s]+(\d{1,2})/i);
  const applicants = normalized.match(/신청자?\s*([\d,]+)\s*\/\s*([\d,]+)/i);
  const type = normalized.match(/캠페인\s*타입\s*([^\s]+)/i)?.[1] || '';

  return {
    endDate: period
      ? `20${period[4]}-${period[5].padStart(2, '0')}-${period[6].padStart(2, '0')}`
      : '',
    applyCount: applicants ? Number(applicants[1].replace(/,/g, '')) : 0,
    limitCount: applicants ? Number(applicants[2].replace(/,/g, '')) : 0,
    platform: type ? detectPlatform(type, type) : fallbackPlatform,
  };
}

/** The list card includes platform icons before the campaign artwork. */
export function parseCloudReviewMainImage(html: string): string {
  const $ = cheerio.load(html);
  const image = $('img').toArray()
    .map(element => $(element).attr('data-original') || $(element).attr('data-src') || $(element).attr('src') || '')
    .find(src => /\/main_image\//i.test(src));
  if (!image) return '';
  if (image.startsWith('//')) return `https:${image}`;
  return image.startsWith('http') ? image : `https://cloudreview.co.kr${image.startsWith('/') ? '' : '/'}${image}`;
}

async function enrichCampaignDetails(campaigns: Campaign[]): Promise<void> {
  const concurrency = 4;
  for (let offset = 0; offset < campaigns.length; offset += concurrency) {
    await Promise.all(campaigns.slice(offset, offset + concurrency).map(async campaign => {
      try {
        const response = await axios.get(campaign.campaignUrl, { headers: HEADERS, timeout: 6000 });
        const facts = parseCloudReviewDetail(String(response.data || ''), campaign.platform);
        const mainImage = parseCloudReviewMainImage(String(response.data || ''));
        if (facts.endDate) campaign.endDate = facts.endDate;
        if (facts.limitCount > 0) {
          campaign.limitCount = facts.limitCount;
          campaign.applyCount = facts.applyCount;
        }
        campaign.platform = facts.platform;
        if (mainImage) campaign.imageUrl = mainImage;
        campaign.dataSource = 'detail';
      } catch (error: any) {
        console.warn(`[Parallel-Crawl] 클라우드리뷰 상세 ${campaign.id} skipped:`, error.message);
      }
    }));
  }
}

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

            if (collected.some(item => item.id === `cr-${cpId}`)) return;
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
await enrichCampaignDetails(collected);
return collected;
}
