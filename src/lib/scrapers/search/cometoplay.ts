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
        const playCategories = ['001', '002', '003', '004', '005', '006'];
        const rawItems: any[] = [];
        for (const catId of playCategories) {
          try {
            const url = `https://www.cometoplay.kr/item_list.php?category_id=${catId}&page=1`;
            const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
            const $ = cheerio.load(res.data);

            $('a[href*="item.php"]').each((i, el) => {
              const href = $(el).attr('href') || '';
              const numMatch = href.match(/it_id=(\d+)/);
              if (!numMatch) return;
              const cpId = numMatch[1];
              const id = `cometoplay-${cpId}`;
              if (rawItems.some(c => c.id === id)) return;

              const parent = $(el).closest('li, div.item, div.box, tr, td, div');
              const itNameText = parent.find('.it_name').text().trim().replace(/\s+/g, ' ');
              let rawTitle = itNameText || $(el).text().trim().replace(/\s+/g, ' ') || parent.text().trim().replace(/\s+/g, ' ');
              if (keyword && !rawTitle.toLowerCase().includes(keyword.toLowerCase())) return;

              let realImg = '';
              parent.find('img').each((_, imgEl) => {
                const src = $(imgEl).attr('src') || '';
                if (src && (src.includes('data/') || src.includes('thumb')) && !src.includes('scrap_ic') && !src.includes('txt_ico')) {
                  realImg = src;
                }
              });
              if (realImg.startsWith('./')) realImg = 'https://www.cometoplay.kr' + realImg.slice(1);
              else if (realImg && !realImg.startsWith('http')) realImg = `https://www.cometoplay.kr/${realImg}`;

              const parentText = parent.text().replace(/\s+/g, ' ');
              const cntMatch = parentText.match(/신청\s*([\d,]+)\s*명?\s*\/\s*모집\s*([\d,]+)\s*명?/i) || parentText.match(/신청인원\s*([\d,]+)\s*명?\s*\/\s*모집인원\s*([\d,]+)\s*명?/i);
              const applyCount = cntMatch ? parseInt(cntMatch[1].replace(/,/g, ''), 10) : 0;
              const limitCount = cntMatch ? parseInt(cntMatch[2].replace(/,/g, ''), 10) : 0;

              const cleanTitle = rawTitle
                .replace(/(?:D\s*-\s*day\s*\d+|D-Day|\d+\s*일\s*남음)?\s*신청\s*\d+.*$/gi, '')
                .replace(/D-day\s*\d+/gi, '')
                .trim();

              let platform: any = detectPlatform(cleanTitle, cleanTitle);
              const iClass = parent.find('i').attr('class') || '';
              if (iClass.includes('insta')) platform = 'instagram';
              else if (iClass.includes('clip')) platform = 'clip';
              else if (iClass.includes('youtube')) platform = 'youtube';
              else if (iClass.includes('blog')) platform = 'blog';

              let location = '';
              const locMatch = cleanTitle.match(/^\[([^\]]+)\]/);
              if (locMatch) {
                const tag = locMatch[1].trim();
                if (!['인스타그램', '유튜브', '블로그', '쿠팡', '클립'].includes(tag)) {
                  location = tag;
                }
              }

              const fullUrl = href.startsWith('http') ? href : `https://www.cometoplay.kr/${href}`;

              if (cleanTitle && cleanTitle.length > 3) {
                rawItems.push({
                  id,
                  title: cleanTitle.slice(0, 60),
                  platform,
                  category: detectCategory(cleanTitle, cleanTitle),
                  location,
                  campaignUrl: fullUrl,
                  imageUrl: realImg || 'https://viral-re.co.kr/icon.png',
                  targetSite: '놀러와체험단',
                  limitCount,
                  applyCount,
                  startDate: now.toISOString().split('T')[0],
                  endDate: '',
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString()
                });
              }
            });
          } catch (e) {}
        }

        // 🔑 실시간 15개 병렬 청크로 상세 페이지(.etc_list2)에서 100% 진짜 제공 혜택 패치
        const chunkSize = 15;
        for (let i = 0; i < rawItems.length; i += chunkSize) {
          const chunk = rawItems.slice(i, i + chunkSize);
          const enriched = await Promise.all(
            chunk.map(async (item) => {
              try {
                const dRes = await axios.get(item.campaignUrl, { headers: HEADERS, timeout: 4000 });
                const $d = cheerio.load(dRes.data);
                let benefitText = $d('.etc_list2').text().replace(/\s+/g, ' ').trim();
                benefitText = benefitText.replace(/^제공내역\s*/, '').trim();
                return {
                  ...item,
                  description: benefitText || ''
                };
              } catch (e) {
                return {
                  ...item,
                  description: ''
                };
              }
            })
          );
          collected.push(...enriched);
        }
      } catch (e) {}
    })();
return collected;
}
