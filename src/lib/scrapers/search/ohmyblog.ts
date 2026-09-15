import type { Campaign } from '../../db';
import axios from 'axios';
import { detectCategory, detectPlatform, HEADERS } from '../../scraper-utils';

const ORIGIN = 'https://ohmyblog.co.kr';

export async function scrape(keyword: string): Promise<Campaign[]> {
  const rows: Campaign[] = [];
  const now = new Date().toISOString();
  try {
    for (let page = 1; page <= 5; page++) {
      const params = new URLSearchParams({ limit: '100', page: String(page) });
      if (keyword.trim()) params.set('keyword', keyword.trim());
      const response = await axios.get(ORIGIN + '/api/web/campaign/active?' + params, { headers: HEADERS, timeout: 8000 });
      const campaigns = response.data?.result === 'Y' && Array.isArray(response.data?.data?.campaigns) ? response.data.data.campaigns : [];
      if (!campaigns.length) break;
      for (const item of campaigns) {
        const title = String(item.app_title || item.app_companyName || '').trim();
        const description = String(item.supplyItem || item.app_companyName || title).trim();
        if (!title || (keyword && !(title + ' ' + description).toLowerCase().includes(keyword.toLowerCase()))) continue;
        const platformText = String(item.sns_platforms || item.content_type || item.app_type_text || '');
        const thumbnail = String(item.thumbnail || '');
        rows.push({
          id: 'ohmy-' + item.app_seq, title, description,
          platform: detectPlatform(title, platformText), category: detectCategory(title, description),
          campaignUrl: ORIGIN + '/user/productDetail.apsl?app_seq=' + item.app_seq,
          imageUrl: thumbnail ? (thumbnail.startsWith('http') ? thumbnail : ORIGIN + (thumbnail.startsWith('/') ? '' : '/') + thumbnail) : 'https://viral-re.co.kr/icon.png',
          targetSite: '오마이블로그',
          limitCount: Number(item.app_recruitCount) || 0, applyCount: Number(item.applicant_count || item.app_memberCount) || 0,
          startDate: String(item.app_recruitStartDate || '').slice(0, 10) || undefined,
          endDate: String(item.app_recruitEndDate || '').slice(0, 10),
          createdAt: now, updatedAt: now, searchKeywords: keyword ? ',' + keyword + ',' : undefined,
        });
      }
      if (campaigns.length < 100) break;
    }
  } catch (error) {
    console.warn('[Parallel-Crawl] 오마이블로그 failed:', error instanceof Error ? error.message : error);
  }
  return [...new Map(rows.map(row => [row.id, row])).values()];
}
