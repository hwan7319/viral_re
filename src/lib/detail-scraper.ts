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

  // 0. 범용 플랫폼 템플릿 문구 자동 필터링 (업체 커스텀 미션만 정밀 추출)
  cleaned = cleaned
    .replace(/1\.\s*사진을 정성껏 다양하게 찍어 주세요\.?/g, '')
    .replace(/2\.\s*동영상을 포함하여 사진은 최소 15장 이상 사용해주세요\.?/g, '')
    .replace(/3\.\s*하단에 지도 위치 링크를 꼭 넣어주세요\.?/g, '')
    .replace(/4\.\s*텍스트 1,000자 이상 서술해주세요\.?/g, '')
    .replace(/5\.\s*리뷰 작성 시, 제목과 본문 내용에 지정된 키워드.*?\./g, '')
    .replace(/6\.\s*참고해 주세요\.?/g, '')
    .replace(/- 인스타, 페이스북 등 SNS에 함께 리뷰 가능하신 분들의 선정 확률이 더 높습니다\.?/g, '')
    .replace(/※ 캠페인 미션이 지켜지지 않을 시 수정 요청이 있을 수 있습니다\.?/g, '')
    .trim();

  if (!cleaned) return '';

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

// 🔑 원본 상세 페이지의 진짜 지원 현황(applyCount / limitCount) 스크레이퍼
export async function scrapeDetailCounts(url: string, targetSite: string): Promise<{ applyCount?: number; limitCount?: number }> {
  if (!url) return {};
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const html = res.data;
    if (typeof html !== 'string') return {};

    const $ = cheerio.load(html);
    const siteLower = (targetSite || '').toLowerCase();

    // 1. 포블로그 -> .reviewerCnt 또는 .cat-right-cnt 또는 신청자(N)/선정자(N)
    if (siteLower.includes('포블로그') || url.includes('4blog.net')) {
      const cntText = $('.reviewerCnt, .cat-right-cnt, #requestsLegacy, .nav-tabs, body').text().replace(/\s+/g, ' ').trim();
      const match = cntText.match(/신청\s*(\d+)\s*\/\s*(\d+)/i) || cntText.match(/신청자\s*\(\s*(\d+)\s*\).*?선정자\s*\(\s*(\d+)\s*\)/i);
      if (match) {
        const applyCount = parseInt(match[1], 10);
        const limitCount = match[2] ? parseInt(match[2], 10) : undefined;
        if (!isNaN(applyCount)) {
          return { applyCount, limitCount: limitCount && !isNaN(limitCount) ? limitCount : undefined };
        }
      }
    }
    // 2. 디너의여왕 -> 해당 campaign ID와 exact 매칭되는 apply_badge 정밀 조준
    else if (siteLower.includes('디너의여왕') || url.includes('dinnerqueen')) {
      const dqId = url.split('/').pop() || '';
      let targetBadgeText = '';
      
      if (dqId) {
        $(`a[href*="${dqId}"]`).each((_, el) => {
          if (!targetBadgeText) {
            const cardText = $(el).closest('.qz-dq-card').find('.apply_badge').text().trim();
            if (cardText.includes('신청')) {
              targetBadgeText = cardText;
            }
          }
        });
      }
      if (!targetBadgeText) {
        targetBadgeText = $('.apply_badge').first().text().trim() || $('body').text();
      }
      
      const match = targetBadgeText.match(/신청\s*(\d+)\s*\/\s*모집\s*(\d+)/i);
      if (match) {
        return { applyCount: parseInt(match[1], 10), limitCount: parseInt(match[2], 10) };
      }
    }
    // 3. 강남맛집 -> .item_info .numb
    else if (siteLower.includes('강남맛집') || url.includes('939au0g4vj8sq')) {
      const text = $('.item_info .numb').text().trim() || $('#cmp_guide').text();
      const match = text.match(/신청\s*(\d+)\s*\/\s*모집\s*(\d+)/i);
      if (match) {
        return { applyCount: parseInt(match[1], 10), limitCount: parseInt(match[2], 10) };
      }
    }
  } catch (err: any) {
    console.warn(`[Detail-Counts-Scraper] Failed for ${url}:`, err.message);
  }
  return {};
}
export async function scrapeDetailBenefit(url: string, targetSite: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const html = res.data;
    if (typeof html !== 'string') return undefined;

    const $ = cheerio.load(html);
    const siteLower = (targetSite || '').toLowerCase();

    // 1. 디너의여왕 -> "제공 내역" 헤더 블록 아래 .qz-collapse__content
    if (siteLower.includes('디너의여왕') || url.includes('dinnerqueen')) {
      let bText = '';
      $('.qz-collapse').each((_, el) => {
        const headerText = $(el).text();
        if (headerText.includes('제공 내역') || headerText.includes('제공내역') || headerText.includes('제공 혜택')) {
          const strongText = $(el).find('.qz-collapse__content strong, .qz-collapse__content p, .qz-collapse__content h4').first().text().trim();
          if (strongText && strongText.length > 1 && !strongText.includes('확인사항') && !strongText.includes('알아두면')) {
            bText = strongText;
          } else {
            const fullContent = $(el).find('.qz-collapse__content').text().trim();
            const splitText = fullContent.split(/참여\s*전\s*필수\s*확인사항|★|알아두면/)[0].trim();
            if (splitText && splitText.length > 1) bText = splitText;
          }
        }
      });
      if (bText) {
        bText = bText.replace(/참여\s*전\s*필수\s*확인사항.*$/gi, '').trim();
        if (bText.length > 1) return bText;
      }
    }
    // 2. 강남맛집 -> dd.sub_tit
    else if (siteLower.includes('강남맛집') || url.includes('939au0g4vj8sq')) {
      let bText = $('dd.sub_tit').first().text().trim() || $('.sub_tit').text().trim();
      bText = bText.replace(/가이드라인\s*참고.*$/gi, '').trim();
      if (bText && bText.length > 1) return bText;
    }
    // 3. 포블로그 -> .campaigninfo-label "리뷰어 제공"
    else if (siteLower.includes('포블로그') || url.includes('4blog.net')) {
      let bText = '';
      $('.campaigninfo-label, label, dt').each((_, el) => {
        const label = $(el).text().trim();
        if (label.includes('제공') || label.includes('리뷰어')) {
          bText = $(el).next('.campaigninfo-text').text().trim() || $(el).parent().find('.campaigninfo-text').text().trim();
        }
      });
      if (!bText) {
        bText = $('.campaigninfo-text').first().text().trim();
      }
      if (bText && bText.length > 1) return bText;
    }
    // 4. 리뷰노트 -> Next.js JSON or offer element
    else if (siteLower.includes('리뷰노트') || url.includes('reviewnote.co.kr')) {
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          const offer = parsed.props?.pageProps?.campaign?.offer || parsed.props?.pageProps?.data?.offer;
          if (offer) return offer;
        } catch (e) {}
      }
      const bText = $('.offer, .campaign-offer, .benefit').first().text().trim();
      if (bText && bText.length > 1) return bText;
    }
    // 5. 레뷰 (revu.net)
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
      let keywordsStr = '';
      $('dl').each((_, el) => {
        const dt = $(el).find('dt').text().trim();
        if (dt.includes('키워드')) {
          keywordsStr = $(el).find('dd').text().trim().replace(/\s+/g, ' ');
        }
      });

      const rawGuideHtml = $('#cmp_guide').html() || $('dd#cmp_guide').html() || $('.guide_box').html() || '';
      let text = rawGuideHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|dd)>/gi, '\n').replace(/<[^>]+>/g, '');
      const lines = text.split('\n');
      const cleanLines: string[] = [];

      for (let line of lines) {
        let t = line.trim();
        if (!t) continue;
        if (t.includes('사진을 정성껏 다양하게')) continue;
        if (t.includes('동영상을 포함하여 사진은 최소')) continue;
        if (t.includes('하단에 지도 위치 링크를')) continue;
        if (t.includes('텍스트 1,000자 이상')) continue;
        if (t.includes('리뷰 작성 시, 제목과 본문 내용에 지정된 키워드')) continue;
        if (t.includes('참고해 주세요.') && t.length < 15) continue;
        if (t.includes('SNS에 함께 리뷰 가능하신 분')) continue;
        if (t.includes('캠페인 미션이 지켜지지 않을 시 수정')) continue;
        cleanLines.push(t);
      }

      let resultMission = cleanLines.join('\n').trim();
      let parts: string[] = [];

      if (keywordsStr) {
        parts.push(`📌 [지정 필수 키워드]\n${keywordsStr}`);
      }
      if (resultMission) {
        parts.push(`📌 [업체 상세 미션 & 가이드라인]\n${resultMission}`);
      } else if (keywordsStr) {
        parts.push(`📌 [안내] 위 지정 필수 키워드를 제목 1회, 본문 3회 이상 자연스럽게 작성해 주시면 됩니다.`);
      }

      extractedRaw = parts.join('\n\n');
    }
    // 2. 포블로그 (4blog.net)
    else if (siteLower.includes('포블로그') || url.includes('4blog.net')) {
      const missionItems: string[] = [];

      $('.campaigninfo-label, label, dt, strong, .panel-heading').each((_, el) => {
        const label = $(el).text().trim();
        if (label.includes('미션') || label.includes('이용 안내') || label.includes('이용안내') || label.includes('가이드') || label.includes('키워드')) {
          const parent = $(el).parent();
          const infoText = parent.find('.campaigninfo-text').text().trim() || parent.text().replace(label, '').trim();
          if (infoText && infoText.length > 5 && !missionItems.includes(infoText)) {
            missionItems.push(`📌 [${label}]\n${infoText}`);
          }
        }
      });

      if (missionItems.length === 0) {
        $('.campaigninfo-text').each((i, el) => {
          const text = $(el).text().trim();
          if (i > 0 && text.length > 15 && !text.includes('자유이용권') && !text.includes('제공') && !text.includes('도로명') && !text.includes('지번')) {
            missionItems.push(text);
          }
        });
      }

      const ogDesc = $('meta[property="og:description"]').attr('content') || '';
      if (missionItems.length === 0 && ogDesc && !ogDesc.includes('포블로그') && ogDesc.length > 10) {
        missionItems.push(ogDesc);
      }

      extractedRaw = missionItems.join('\n\n');
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
