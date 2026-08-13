import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

// 🚫 사이트 공통 메뉴 / 푸터 카테고리 목록 블랙리스트
const BLACKLIST_PATTERNS = [
  '체험단·인플루언서 마케팅은 역시',
  '디지털,신기술,빅데이터로',
  '체계적인 관리,분석시스템',
  '1:1맞춤 컨설팅을 받아보세요',
  '대한민국 1등 체험단',
  '전국 맛집 체험 기회를 한 번에',
  '맛집 체험단을 찾는다면 지금 바로',
  '전체 클립형 릴스형',
  '클립형 릴스형 배송',
  '배송 맛집 지역 배달 여가'
];

// 🧼 줄바꿈, 텍스트 정렬, 앞머리 기호 정밀 가독성 정제 엔진
export function formatMissionText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. HTML 태그 정제 및 엔티티 치환
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/(p|li|div|h[1-6])>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  cleaned = cleaned
    .replace(/&nbsp;/gi, ' ')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&');

  // 2. 부자연스러운 숫자/날짜 사이 중간 줄바꿈 복원
  cleaned = cleaned.replace(/([0-9]+\.[0-9]*)\n([0-9]+)/g, '$1$2');

  // 3. 줄 단위 분석 및 앞머리 기호 정제
  const lines = cleaned.split('\n');
  const formattedLines: string[] = [];

  for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    if (/^[•\-\*★✔◈※▶\s]+$/.test(trimmed)) continue;

    trimmed = trimmed.replace(/^([•\-\*★✔◈※▶]\s*)+/g, (match) => {
      const symbol = match.trim()[0];
      return symbol ? `${symbol} ` : '';
    });

    const hasPrefix = /^[0-9]+\.|\d+[\.\)]|^[•\-\*★✔◈※▶#]/.test(trimmed);
    if (!hasPrefix && trimmed.length > 2) {
      trimmed = `• ${trimmed}`;
    }

    formattedLines.push(trimmed);
  }

  let result = formattedLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

// 🔑 원본 상세 페이지의 진짜 제공 혜택(Offer/Benefit) 전용 스크레이퍼
export async function scrapeDetailBenefit(url: string, targetSite: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const html = res.data;
    if (typeof html !== 'string') return undefined;

    const $ = cheerio.load(html);
    const siteLower = (targetSite || '').toLowerCase();

    // 1. 디너의여왕 -> .qz-collapse__content p strong.w-600 (예: "3만원 식사권")
    if (siteLower.includes('디너의여왕') || url.includes('dinnerqueen')) {
      const bText = $('.qz-collapse__content p strong.w-600').first().text().trim() ||
                    $('.qz-collapse__content p.qz-body-kr').first().text().trim();
      if (bText && bText.length > 1) return bText;
    }
    // 2. 강남맛집 -> dd.sub_tit
    else if (siteLower.includes('강남맛집') || url.includes('939au0g4vj8sq')) {
      const bText = $('dd.sub_tit').first().text().trim() || $('.sub_tit').text().trim();
      if (bText && bText.length > 1) return bText;
    }
    // 4. 레뷰 (revu.net)
    else if (siteLower.includes('레뷰') || url.includes('revu.net')) {
      const bText = $('.benefit-info, .offer-info, .campaign-benefit').text().trim();
      if (bText && bText.length > 1) return bText;
    }
  } catch (err: any) {
    console.warn(`[Detail-Benefit-Scraper] Failed for ${url}:`, err.message);
  }
  return undefined;
}

// 🔑 17대 체험단 사이트별 원본 상세 페이지 미션/가이드라인 전용 스크레이퍼
export async function scrapeDetailMission(url: string, targetSite: string): Promise<string | undefined> {
  if (!url) return undefined;
  
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const html = res.data;
    if (typeof html !== 'string') return undefined;

    const $ = cheerio.load(html);
    let extractedRaw = '';
    const siteLower = (targetSite || '').toLowerCase();

    // 1. 강남맛집 (xn--939au0g4vj8sq.net)
    if (siteLower.includes('강남맛집') || url.includes('939au0g4vj8sq')) {
      extractedRaw = $('#cmp_guide').html() || 
                     $('dd#cmp_guide').html() || 
                     $('.guide_box').html() || '';
    }
    // 2. 포블로그 (4blog.net)
    else if (siteLower.includes('포블로그') || url.includes('4blog.net')) {
      const ogDesc = $('meta[property="og:description"]').attr('content') || '';
      let targetText = '';

      $('.campaigninfo-text').each((_, el) => {
        const html = $(el).html() || '';
        const text = $(el).text().trim();
        if (html.includes('sponsorBanner') || text.includes('리뷰 필수가이드') || text.includes('포스팅 제목') || text.includes('가이드')) {
          targetText = text;
        }
      });

      if (!targetText && ogDesc && !ogDesc.includes('영수증리뷰필수') && ogDesc.length > 10) {
        targetText = ogDesc;
      }

      if (!targetText) {
        $('.campaigninfo-text').each((_, el) => {
          const text = $(el).text().trim();
          if (text && !text.includes('영수증리뷰필수') && !text.includes('테이블합석') && text.length > 15) {
            targetText = text;
          }
        });
      }

      extractedRaw = targetText;
    }
    // 3. 디너의여왕 (dinnerqueen.net)
    else if (siteLower.includes('디너의여왕') || url.includes('dinnerqueen')) {
      const items: string[] = [];
      $('.qz-wrap__list li, .qz-collapse__content p, .qz-collapse__content li').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (t && t.length > 2 && !t.includes('클립형') && !t.includes('릴스형') && !t.includes('페이백') && !t.includes('기자단')) {
          items.push(t);
        }
      });
      if (items.length > 0) {
        extractedRaw = items.join('\n');
      } else {
        extractedRaw = $('.qz-dq-detail__mission').html() || $('div[class*="mission"]').html() || '';
      }
    }
    // 4. 레뷰 (revu.net)
    else if (siteLower.includes('레뷰') || url.includes('revu.net')) {
      extractedRaw = $('.mission-info').html() || 
                     $('.guide-info').html() || 
                     $('.campaign-guide').html() || '';
    }
    // 5. 리뷰노트 (reviewnote.co.kr)
    else if (siteLower.includes('리뷰노트') || url.includes('reviewnote')) {
      extractedRaw = $('.mission_desc').html() || 
                     $('.guide_desc').html() || '';
    }
    // 6. 체험뷰 (chview.co.kr)
    else if (siteLower.includes('체험뷰') || url.includes('chview')) {
      extractedRaw = $('.mission_box').html() || $('.guide_text').html() || '';
    }
    // 7. 미블 (mible.co.kr)
    else if (siteLower.includes('미블') || url.includes('mible')) {
      extractedRaw = $('.mission_info').html() || $('.campaign_guide').html() || '';
    }
    // 8. 기타 사이트 범용 파싱
    else {
      extractedRaw = $('#cmp_guide').html() || 
                     $('.campaigninfo-text').html() || 
                     $('.mission').html() || 
                     $('.guide').html() || '';
    }

    // 블랙리스트 문구 검증
    for (const pattern of BLACKLIST_PATTERNS) {
      if (extractedRaw.includes(pattern)) {
        return undefined;
      }
    }

    const formatted = formatMissionText(extractedRaw);

    if (formatted && formatted.length > 5) {
      return formatted;
    }
  } catch (err: any) {
    console.warn(`[Detail-Scraper] Failed to scrape mission for ${url}:`, err.message);
  }
  return undefined;
}
