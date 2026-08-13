import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

// 🚫 사이트 공통 메뉴 / 푸터 카테고리 목록 블랙리스트 (엉뚱한 메뉴 텍스트 긁힘 방지)
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

// 🧼 줄바꿈 및 문단 가독성 정제 헬퍼 함수
export function formatMissionText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. HTML 태그 줄바꿈 변환
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/p>/gi, '\n');
  cleaned = cleaned.replace(/<\/li>/gi, '\n');
  cleaned = cleaned.replace(/<\/div>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]+>/g, ''); // 태그 제거

  // 2. 항목 번호 및 포인트 기호 앞 자동 줄바꿈 및 문단 분리
  cleaned = cleaned.replace(/([^\n])\s*([0-9]+\.\s*)/g, '$1\n$2');
  cleaned = cleaned.replace(/([^\n])\s*(★|✔|■|◆|●|•|◈|※|▶|- )/g, '$1\n\n$2');

  // 3. 공백 및 중복 줄바꿈 정돈
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  return cleaned;
}

// 🔑 17대 체험단 사이트별 원본 상세 페이지 미션/가이드라인 전용 스크레이퍼
export async function scrapeDetailMission(url: string, targetSite: string): Promise<string | undefined> {
  if (!url) return undefined;
  
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const html = res.data;
    if (typeof html !== 'string') return undefined;

    const $ = cheerio.load(html);
    let extractedHtml = '';
    const siteLower = (targetSite || '').toLowerCase();

    // 1. 강남맛집 (xn--939au0g4vj8sq.net) -> dd#cmp_guide
    if (siteLower.includes('강남맛집') || url.includes('939au0g4vj8sq')) {
      extractedHtml = $('#cmp_guide').html() || 
                      $('dd#cmp_guide').html() || 
                      $('.guide_box').html() || '';
    }
    // 2. 포블로그 (4blog.net) -> .campaigninfo-text
    else if (siteLower.includes('포블로그') || url.includes('4blog.net')) {
      extractedHtml = $('.campaigninfo-text').html() || 
                      $('div.uline + div + div.campaigninfo-text').html() || '';
    }
    // 3. 디너의여왕 (dinnerqueen.net) -> .qz-wrap__list 항목 정밀 수집
    else if (siteLower.includes('디너의여왕') || url.includes('dinnerqueen')) {
      const items: string[] = [];
      $('.qz-wrap__list li, .qz-collapse__content p').each((_, el) => {
        const t = $(el).text().trim();
        if (t && !t.includes('클립형') && !t.includes('릴스형') && !t.includes('페이백') && !t.includes('기자단')) {
          items.push('• ' + t);
        }
      });
      if (items.length > 0) {
        extractedHtml = items.join('\n');
      } else {
        extractedHtml = $('.qz-dq-detail__mission').text().trim() || $('div[class*="mission"]').text().trim();
      }
    }
    // 4. 레뷰 (revu.net)
    else if (siteLower.includes('레뷰') || url.includes('revu.net')) {
      extractedHtml = $('.mission-info').html() || 
                      $('.guide-info').html() || 
                      $('.campaign-guide').html() || '';
    }
    // 5. 리뷰노트 (reviewnote.co.kr)
    else if (siteLower.includes('리뷰노트') || url.includes('reviewnote')) {
      extractedHtml = $('.mission_desc').html() || 
                      $('.guide_desc').html() || '';
    }
    // 6. 체험뷰 (chview.co.kr)
    else if (siteLower.includes('체험뷰') || url.includes('chview')) {
      extractedHtml = $('.mission_box').html() || $('.guide_text').html() || '';
    }
    // 7. 미블 (mible.co.kr)
    else if (siteLower.includes('미블') || url.includes('mible')) {
      extractedHtml = $('.mission_info').html() || $('.campaign_guide').html() || '';
    }
    // 8. 기타 사이트 범용 파싱
    else {
      extractedHtml = $('#cmp_guide').html() || 
                      $('.campaigninfo-text').html() || 
                      $('.mission').html() || 
                      $('.guide').html() || '';
    }

    // 블랙리스트 푸터/카테고리 텍스트 걸러내기
    for (const pattern of BLACKLIST_PATTERNS) {
      if (extractedHtml.includes(pattern)) {
        return undefined;
      }
    }

    const formatted = formatMissionText(extractedHtml);

    if (formatted && formatted.length > 5) {
      return formatted;
    }
  } catch (err: any) {
    console.warn(`[Detail-Scraper] Failed to scrape mission for ${url}:`, err.message);
  }
  return undefined;
}
