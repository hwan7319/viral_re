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
        const seenAssaViewIds = new Set<string>();
        const maxAssaPages = keyword ? 5 : 30;
        for (let page = 1; page <= maxAssaPages; page++) {
          const pageUrl = `https://assaview.co.kr/campaign_list.php?page=${page}${keyword ? `&search=${encodeURIComponent(keyword)}` : ''}`;
          try {
            const res = await axios.get(pageUrl, { headers: HEADERS, timeout: 8000 });
            const $ = cheerio.load(res.data);

            $('a[href*="campaign.php?cp_id="]').each((_, el) => {
              const href = $(el).attr('href') || '';
              const cpIdMatch = href.match(/cp_id=(\d+)/);
              if (!cpIdMatch) return;
              const cpId = cpIdMatch[1];
              if (seenAssaViewIds.has(cpId)) return;

              const parent = $(el).closest('li, a, div.item, div.card');
              const subjectText = parent.find('.subject').text().trim().replace(/\s+/g, ' ');
              const optNameText = parent.find('.opt_name').text().trim().replace(/\s+/g, ' ');
              const chipText = parent.find('.rs_cp_type_chip').text().trim();
              const iconSrc = parent.find('.review_type_icon').attr('src') || '';

              let title = subjectText || optNameText;
              let description = optNameText || subjectText;

              if (!title || title === '참여 조건' || title === '참여조건') {
                const rawText = parent.find('.details').text().replace(/\s+/g, ' ').trim();
                title = rawText.replace(/방문형|배송형|구매형|신청.*$/gi, '').trim();
              }

              title = title.replace(/\d{4}\/\d{2}\/\d{2}\s*\d{2}:\d{2}:\d{2}/gi, '').trim();

              const tLower = title.toLowerCase().trim();
              const dLower = description.toLowerCase().trim();
              if (tLower === 'test' || tLower === 'dummy' || tLower === 'mock' || tLower === '참여 조건' || tLower === '참여조건' || tLower.includes('[1원 상당] test') || (tLower.includes('test') && dLower.includes('1원')) || title.length < 2) {
                return;
              }

              let platform = detectPlatform(title, description);
              if (iconSrc.includes('reels_icon') || iconSrc.includes('insta')) platform = 'instagram';
              else if (iconSrc.includes('clip')) platform = 'clip';
              else if (chipText.includes('인스타')) platform = 'instagram';

              let img = parent.find('.imgBox img').attr('src') || parent.find('img').attr('src') || '';
              if (img && !img.startsWith('http')) {
                img = `https://assaview.co.kr/${img.replace(/^\.\//, '')}`;
              }

              const applyMatch = parent.find('.desc b').text().trim();
              const limitMatch = parent.find('.desc').text().match(/\/ (\d+)명/);
              const applyCount = parseInt(applyMatch, 10) || 0;
              const limitCount = limitMatch ? parseInt(limitMatch[1], 10) : 0;

              if (keyword && !title.toLowerCase().includes(keyword.toLowerCase()) && !description.toLowerCase().includes(keyword.toLowerCase())) return;

              seenAssaViewIds.add(cpId);
              collected.push({
                id: `assaview-${cpId}`,
                title: title.slice(0, 80),
                description: description || title,
                platform,
                category: detectCategory(title, description),
                campaignUrl: `https://assaview.co.kr/campaign.php?cp_id=${cpId}`,
                imageUrl: img || 'https://viral-re.co.kr/icon.png',
                targetSite: '아싸뷰',
                limitCount,
                applyCount,
                startDate: now.toISOString().split('T')[0],
                endDate: '',
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
              });
            });
          } catch (e) {
            break;
          }
        }
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 아싸뷰 (assaview.co.kr) failed:', err.message);
      }
    })();
return collected;
}
