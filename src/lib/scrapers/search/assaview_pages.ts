import type { Campaign } from '../../db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { HEADERS, detectCategory, detectPlatform, inferCampaignLocation } from '../../scraper-utils';
import { CATEGORY_RULE_VERSION } from '../../category_classifier';

const MAX_DETAIL_CATEGORY_ENRICH = 24;

/** Only campaign hashtags are extracted; navigation/footer text is excluded. */
export function extractAssaViewCategoryContext(html: string): string {
  const $ = cheerio.load(html);
  const published: string[] = [];
  $('.guide_background .info_box').each((_, element) => {
    const label = $(element).find('.head_text').first().text().replace(/\s+/g, ' ').trim();
    if (!/(?:해시태그|제목\s*키워드|본문\s*키워드)/.test(label)) return;
    const value = $(element).find('.inner_box').first().text().replace(/\s+/g, ' ').trim();
    if (value) published.push(value);
  });
  // Never fall back to the whole document: it includes unrelated navigation,
  // sample instructions, and third-party words that create false categories.
  return [...new Set(published)].join(' ').slice(0, 1_200);
}

async function enrichUnknownCategoryDetails(campaigns: Campaign[]): Promise<void> {
  const candidates = campaigns.filter(campaign => campaign.category === 'etc').slice(0, MAX_DETAIL_CATEGORY_ENRICH);
  const concurrency = 6;
  for (let offset = 0; offset < candidates.length; offset += concurrency) {
    await Promise.all(candidates.slice(offset, offset + concurrency).map(async campaign => {
      try {
        const response = await axios.get(campaign.campaignUrl, { headers: HEADERS, timeout: 6_000 });
        const context = extractAssaViewCategoryContext(String(response.data || ''));
        const resolved = resolveAssaViewDetailCategory(campaign.title, campaign.description, context);
        if (!resolved) return;
        campaign.dataSource = 'detail';
        campaign.category = resolved.category;
        campaign.categoryEvidence = resolved.evidence;
        campaign.categoryConfidence = resolved.confidence;
        campaign.categoryRuleVersion = resolved.ruleVersion;
      } catch {
        // A list item remains usable even if its optional category enrichment fails.
      }
    }));
  }
}

/**
 * Published campaign keywords are written for SEO and can contain unrelated
 * terms (for example a laundry product mentioning "여행"). Only promote a
 * previously unknown listing when its detail contains a product signal that
 * identifies one leaf category without interpretation.
 */
export function resolveAssaViewDetailCategory(title: string, description: string, context: string) {
  const text = `${title} ${description} ${context}`.toLowerCase();
  let category = '';
  if (/(?:니플패치|니플밴드|니플s*커버|브라(?:패드)?|브래지어)/.test(text)) category = 'fashion-clothing';
  else if (/(?:분유|신생아s*분유|영아s*산통|아기s*분유|이유식)/.test(text)) category = 'baby';
  else if (/(?:쉐이빙|면도s*(?:젤|크림|폼)?|면도젤)/.test(text)) category = 'beauty-cosmetics';
  else if (/(?:반려견|반려묘|반려동물|강아지|고양이|애견|펫)/.test(text)) category = 'pet';
  else if (/(?:영양제|유산균|비타민|프로바이오틱스)/.test(text)) category = 'health-food';
  if (!category) return undefined;
  return { category, evidence: 'detail-text' as const, confidence: 'high' as const, ruleVersion: CATEGORY_RULE_VERSION };
}
export async function scrape(keyword: string): Promise<Campaign[]> {
const collected: Campaign[] = [];
const now = new Date();
const encodedKeyword = encodeURIComponent(keyword);
await (async () => {
      try {
        const seenAssaViewIds = new Set<string>();
        // A 30-page sequential crawl monopolized the bulk job for several
        // minutes. Keep the current, recent listing window bounded for both
        // scheduled and keyword-triggered collection.
        const maxAssaPages = 5;
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
              const description = optNameText || subjectText;

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
              // 아싸뷰는 목록 카드의 진행 유형이 작성 플랫폼의 근거다. 상품명만으로
              // 블로그로 추정하면 쿠팡 구매형 캠페인이 잘못 표시된다.
              if (chipText.includes('구매') || parent.find('.imgBox').hasClass('coupang_wow_card')) platform = 'coupang';
              else if (iconSrc.includes('reels_icon') || iconSrc.includes('insta')) platform = 'instagram';
              else if (iconSrc.includes('clip')) platform = 'clip';
              else if (chipText.includes('인스타')) platform = 'instagram';

              let img = parent.find('.imgBox img').attr('src') || parent.find('img').attr('src') || '';
              if (img && !img.startsWith('http')) {
                img = `https://assaview.co.kr/${img.replace(/^\.\//, '')}`;
              }

              const progressText = parent.find('.desc').text().replace(/\s+/g, ' ').trim();
              const progressMatch = progressText.match(/신청\s*(\d+)\s*\/\s*(\d+)\s*명/);
              const applyCount = progressMatch ? Number(progressMatch[1]) : 0;
              const limitCount = progressMatch ? Number(progressMatch[2]) : 0;

              if (keyword && !title.toLowerCase().includes(keyword.toLowerCase()) && !description.toLowerCase().includes(keyword.toLowerCase())) return;

              seenAssaViewIds.add(cpId);
              collected.push({
                id: `assaview-${cpId}`,
                title: title.slice(0, 80),
                description: description || title,
                platform,
                category: detectCategory(title, description),
                location: inferCampaignLocation(title, `${description} ${chipText}`, platform),
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
await enrichUnknownCategoryDetails(collected);
return collected;
}
