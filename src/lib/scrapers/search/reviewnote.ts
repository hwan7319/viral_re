import type { Campaign } from '../../db';
import axios from 'axios';
import { HEADERS, detectCategory, buildAutoKeywords } from '../../scraper-utils';
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected: Campaign[] = [];
const now = new Date();
const encodedKeyword = encodeURIComponent(keyword);
await (async () => {
      try {
        const rnApiUrl = `https://www.reviewnote.co.kr/api/v2/campaigns?search=${encodedKeyword}&limit=96`;
        const response = await axios.get(rnApiUrl, {
          headers: {
            ...HEADERS,
            'Referer': 'https://www.reviewnote.co.kr/campaigns',
            'Origin': 'https://www.reviewnote.co.kr'
          },
          timeout: 6000
        });
        const campaignList = response.data?.objects;
        if (Array.isArray(campaignList)) {
          campaignList.forEach((c: any) => {
            const id = `rn-${c.id}`;
            const title = c.title || '';
            const description = c.offer || c.provide_desc || '상세정보 원본 참조';
            const platform = c.channel === 'INSTAGRAM' ? 'instagram' : 'blog';
            const category = detectCategory(title, description);
            const location = c.sido?.name || c.city || undefined;
            const campaignUrl = `https://www.reviewnote.co.kr/campaigns/${c.id}`;
            const imageUrl = c.imageKey 
              ? `https://firebasestorage.googleapis.com/v0/b/reviewnote-e92d9.appspot.com/o/${encodeURIComponent(c.imageKey)}?alt=media` 
              : (c.img1 || '');
            const limitCount = c.infNum ?? c.recruit_count ?? 0;
            const applyCount = c.applicantCount || c.apply_count || 0;
            const endDate = c.applyEndAt ? c.applyEndAt.split('T')[0] : now.toISOString().split('T')[0];
            const autoKws = buildAutoKeywords(title, description);
            const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

            collected.push({
              id, title, description, platform, category, location, campaignUrl,
              imageUrl, targetSite: '리뷰노트', limitCount, applyCount,
              startDate: now.toISOString().split('T')[0], endDate,
              createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords
            });
          });
        }
      } catch (err: any) {
        console.error('[Parallel-Crawl] 리뷰노트 failed:', err.message);
      }
    })();
return collected;
}
