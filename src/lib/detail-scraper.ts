import axios from 'axios';
import * as cheerio from 'cheerio';
import { execSync } from 'child_process';
import { getRevuAuthToken } from './revu_auth';
import { getReviewNoteHeaders } from './rn_auth';
import { getDB } from './db';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1'
};

// 🔑 레뷰 (REVU) 공고 아이템 정밀 미션 및 가이드라인 포맷터
export function formatRevuMission(item: any): string {
  if (!item) return '';
  const rawReward = item.campaignData?.reward || item.brief || '무상 제공 및 식사권 지원';
  const point = item.campaignData?.point || 0;
  const venue = item.venue;
  const venueName = venue?.name;

  let reward = rawReward;
  const pointStr = point > 0 ? (point >= 10000 ? `${point / 10000}만원` : `${point.toLocaleString()}P`) : '';

  if (!rawReward || rawReward === '레뷰 포인트' || rawReward === '포인트') {
    reward = venueName ? `${venueName} 혜택/식사권` + (pointStr ? ` + 레뷰 포인트 ${pointStr}` : '') : (pointStr ? `레뷰 포인트 ${pointStr}` : '무상 제공 및 식사권 지원');
  } else if (point > 0 && !rawReward.includes(pointStr) && pointStr) {
    reward = `${rawReward} + 레뷰 포인트 ${pointStr}`;
  }

  if (venueName && !reward.includes(venueName)) {
    reward = `[${venueName}] ${reward}`;
  }

  let parts: string[] = [];

  if (venue && (venue.name || venue.addressFirst)) {
    let locStr = `📍 [체험 장소 및 방문 주소 안내]\n• 매장명: ${venue.name || '상세 주소 참고'}`;
    if (venue.addressFirst) locStr += `\n• 도로명 주소: ${venue.addressFirst}`;
    if (venue.addressLast) locStr += ` ${venue.addressLast}`;
    if (venue.tel) locStr += `\n• 매장 연락처: ${venue.tel}`;
    parts.push(locStr);
  }

  const media = (item.media || '').toLowerCase();
  const mediaStr = media.includes('insta') 
    ? '인스타그램 (릴스 30초 이상 또는 피드 고화질 이미지 3장 이상)' 
    : media.includes('youtube') 
    ? '유튜브 (쇼츠 또는 3분 이상 정성 리뷰 영상)' 
    : '네이버 블로그 (사진 15장 이상, 1,000자 이상 정성 리뷰)';

  let missionStr = `📋 [포스팅 미션 & 작성 가이드라인]\n• 리뷰 작성 매체: ${mediaStr}\n• 필수 의무 표기: 게시글 최상단 첫 줄에 #협찬 #레뷰 해시태그 반드시 표기\n• 최소 작성 기준: 텍스트 300자 이상, 이미지/영상 5장 이상 필수 등록`;

  if (item.requestStartedOn && item.requestEndedOn) {
    missionStr += `\n• 모집 신청 기간: ${item.requestStartedOn} ~ ${item.requestEndedOn}`;
  }
  if (item.postingStartedOn && item.postingEndedOn) {
    missionStr += `\n• 리뷰 등록 기간: ${item.postingStartedOn} ~ ${item.postingEndedOn}`;
  }

  parts.push(missionStr);
  parts.push(`※ 아래 [실제 캠페인 신청하러 가기] 버튼을 누르시면 레뷰 원본 신청 화면으로 바로 연결됩니다.`);

  return parts.join('\n\n');
}

// 🔑 리뷰노트 (ReviewNote) 공고 아이템 정밀 미션 및 가이드라인 포맷터
export function formatReviewNoteMission(item: any): string {
  if (!item) return '';
  
  let locStr = '';
  const city = typeof item.city === 'string' ? item.city : (item.city?.name || '');
  const sido = typeof item.sido === 'string' ? item.sido : (item.sido?.name || '');
  if (city || sido) {
    locStr = `${city} ${sido}`.trim();
  }

  const channel = (item.channel || '').toUpperCase();
  const channelStr = channel.includes('REELS') 
    ? '인스타그램 릴스 (숏폼 영상 콘텐츠)' 
    : channel.includes('INSTA') 
    ? '인스타그램 피드' 
    : channel.includes('CLIP') 
    ? '네이버 클립 (숏폼 영상)' 
    : '네이버 블로그 (정성 리뷰 포스팅)';

  let parts: string[] = [];
  if (locStr) {
    parts.push(`📍 [체험 장소 및 위치]\n• 위치/지역: ${locStr}`);
  }

  let missionStr = `📋 [포스팅 미션 & 작성 가이드라인]\n• 리뷰 작성 매체: ${channelStr}`;

  if (item.applyEndAt) {
    const applyEnd = item.applyEndAt.split('T')[0];
    missionStr += `\n• 모집 신청 마감: ${applyEnd}`;
  }
  if (item.reviewEndAt) {
    const reviewEnd = item.reviewEndAt.split('T')[0];
    missionStr += `\n• 리뷰 등록 마감: ${reviewEnd}`;
  }

  parts.push(missionStr);
  parts.push(`※ 세부 미션 및 보안 가이드라인은 아래 [실제 캠페인 신청하러 가기] 버튼을 통해 리뷰노트 원본 사이트에서 바로 확인하실 수 있습니다.`);

  return parts.join('\n\n');
}

// 🔑 미블 (Mible - mrblog.net) 공고 아이템 정밀 미션 및 가이드라인 포맷터
export function formatMibleMission(text: string, title?: string, url?: string): string {
  if (!text) return '';

  let cleanText = text
    .replace(/D-Day/g, '')
    .replace(/[0-9]+일\s*남음/g, '')
    .replace(/신청\s*[0-9]+명\s*\/\s*모집\s*[0-9]+명/g, '')
    .replace(/릴스/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const parts: string[] = [];
  const starIndex = cleanText.indexOf('*');
  let notesStr = '';

  if (starIndex > 0) {
    notesStr = cleanText.substring(starIndex).trim();
  }

  if (notesStr) {
    const formattedNotes = notesStr
      .split('**')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => `• ${s.replace(/^\*/, '').trim()}`)
      .join('\n');
    parts.push(`📋 [업체 상세 미션 & 주의사항]\n${formattedNotes}`);
  } else {
    parts.push(`📋 [포스팅 미션 & 작성 가이드라인]\n• ${cleanText}`);
  }

  parts.push(`※ 상세 신청 및 안내 지침은 아래 [실제 캠페인 신청하러 가기] 버튼을 누르시면 미블 원본 사이트에서 바로 확인하실 수 있습니다.`);

  return parts.join('\n\n');
}

function cleanRingbleTitleText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^블로그\s*/gi, '')
    .replace(/(?:오늘\s*마감|\d+\s*일\s*남음|D-Day|D-\d+|\d+\s*시간\s*남음)?\s*신청\s*\d+\s*(?:명)?\s*[\/\,\~]\s*모집\s*\d+\s*(?:명)?/gi, '')
    .replace(/\s*(?:신청|지원)\s*\d+\s*(?:명)?\s*[\/\,\~]\s*모집\s*\d+\s*(?:명)?/gi, '')
    .replace(/\s*(?:신청|지원)\s*\d+\s*(?:명)?/gi, '')
    .replace(/(?:오늘\s*마감|\d+\s*일\s*남음|D-Day)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 🔑 링블 (Ringble - ringble.co.kr) 공고 아이템 정밀 미션 및 가이드라인 포맷터
function formatRingbleMission(htmlOrText: string, title?: string, url?: string, keywords?: string[]): string {
  const parts: string[] = [];
  parts.push(`📋 [링블 (Ringble) 포스팅 미션 & 작성 가이드라인]`);

  const missionSections: string[] = [];

  if (keywords && keywords.length > 0) {
    const uniqueKws = Array.from(new Set(keywords));
    uniqueKws.forEach(kw => {
      if (kw && !kw.includes('function') && !kw.includes('var ') && !kw.includes('setInterval') && !kw.includes('getInternetExplorerVersion')) {
        missionSections.push(kw);
      }
    });
  }

  if (htmlOrText && missionSections.length === 0) {
    try {
      const $ = cheerio.load(htmlOrText || '');
      $('script, style, iframe, header, footer, nav, .header, .footer, .gnb, #header, #footer').remove();
      
      $('.info_wrapper, .supply_title, .campaign_info, tr, td').each((_: number, el: any) => {
        const text = $(el).text().trim();
        const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => {
          if (!l || l.length < 5) return false;
          if (l.includes('function') || l.includes('var ') || l.includes('setInterval') || l.includes('setTimeout') || l.includes('getInternetExplorerVersion') || l.includes('Copyright') || l.includes('사업자')) return false;
          if (l.includes('로그인') || l.includes('회원가입') || l.includes('고객센터') || l.includes('마감임박') || l.includes('광고 문의')) return false;
          return true;
        });
        const cleanSection = lines.join('\n');
        if (cleanSection && cleanSection.length > 25 && !missionSections.includes(cleanSection) && (cleanSection.includes('키워드') || cleanSection.includes('미션') || cleanSection.includes('안내'))) {
          missionSections.push(cleanSection);
        }
      });
    } catch (e) {}
  }

  if (missionSections.length > 0) {
    parts.push(`\n📋 [포스팅 미션 & 작성 가이드라인]`);
    missionSections.forEach(s => {
      parts.push(`• ${s}`);
    });
  }

  parts.push(`\n※ 아래 [실제 캠페인 신청하러 가기] 버튼을 누르시면 링블 원본 상세 화면으로 바로 이동합니다.`);
  return parts.join('\n');
}

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

    // 🔑 [미션 & 가이드라인 영역 내 모집/신청 인원 수치 및 제공혜택 문구 완전 제거]
    const isHeadcountOrBenefitLine = 
      /🎁/i.test(trimmed) ||
      /제공\s*내역|제공내역|제공\s*혜택|제공혜택|제공\s*상품|제공상품|제공\s*품목|제공품목|지원\s*\/\s*상품\s*혜택|상세\s*제공|리뷰어\s*제공/i.test(trimmed) ||
      /^제공\s*:?/i.test(trimmed) ||
      /\d+(?:만|천)?원\s*(?:식사권|체험권|이용권|포인트)/i.test(trimmed) ||
      /추가금액 본인부담|중복 체험은 불가능|진행하실 SNS 채널을 제외한|1인 방문시 반값/i.test(trimmed) ||
      /모집\s*및\s*지원\s*현황/i.test(trimmed) ||
      /신청\s*현황|지원\s*현황|모집\s*현황/i.test(trimmed) ||
      /(?:신청|지원)\s*:?\s*\d+\s*명?\s*[\/\,\~\:]\s*모집\s*:?\s*\d+\s*명?/i.test(trimmed) ||
      /(?:모집|정원)\s*:?\s*\d+\s*명?\s*[\/\,\~\:]\s*(?:신청|지원)\s*:?\s*\d+\s*명?/i.test(trimmed) ||
      /총\s*\d+\s*명\s*모집\s*중/i.test(trimmed) ||
      /신청인원|모집인원|지원인원/i.test(trimmed) ||
      /현재\s*\d+\s*명\s*(?:신청|지원)/i.test(trimmed);

    if (isHeadcountOrBenefitLine) continue;

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
export async function scrapeDetailCounts(url: string, targetSite: string, title?: string): Promise<{ applyCount?: number; limitCount?: number }> {
  if (!url) return {};
  try {
    const siteLower = (targetSite || '').toLowerCase();

    // 1. 리뷰노트 -> API 직접 호출 (CID 및 Title 키워드 2단계 검색)
    if (siteLower.includes('리뷰노트') || url.includes('reviewnote.co.kr')) {
      const cid = url.split('/').pop()?.replace(/[^0-9]/g, '');
      const searchKeywords: string[] = [];
      if (cid) searchKeywords.push(cid);
      if (title) {
        const cleanTitle = title.replace(/\[.*?\]/g, '').trim().split(' ')[0];
        if (cleanTitle && cleanTitle.length >= 2) searchKeywords.push(cleanTitle);
      }

      for (const kw of searchKeywords) {
        try {
          const apiRes = await axios.get(`https://www.reviewnote.co.kr/api/v2/campaigns?search=${encodeURIComponent(kw)}&limit=30`, {
            headers: {
              ...HEADERS,
              'Referer': 'https://www.reviewnote.co.kr/campaigns',
              'Origin': 'https://www.reviewnote.co.kr'
            },
            timeout: 4000
          });
          const list = apiRes.data?.objects;
          if (Array.isArray(list) && list.length > 0) {
            const found = list.find((item: any) => String(item.id) === String(cid) || (title && item.title?.includes(title)));
            if (found) {
              return {
                applyCount: found.applicantCount !== undefined ? Number(found.applicantCount) : 0,
                limitCount: found.infNum !== undefined ? Number(found.infNum) : 5
              };
            }
          }
        } catch (e) {}
      }
    }

    // 2. 일반 사이트 HTML 스크레이핑
    const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const html = res.data;
    if (typeof html !== 'string') return {};

    const $ = cheerio.load(html);

    // 2-1. 포블로그 -> .reviewerCnt 또는 .cat-right-cnt 또는 신청자(N)/선정자(N)
    if (siteLower.includes('포블로그') || url.includes('4blog.net')) {
      const cntText = $('.reviewerCnt, .cat-right-cnt, #requestsLegacy, .nav-tabs, body').text().replace(/\s+/g, ' ').trim();
      const match = cntText.match(/신청\s*([\d,]+)\s*\/\s*([\d,]+)/i) || cntText.match(/신청자\s*\(\s*([\d,]+)\s*\).*?선정자\s*\(\s*([\d,]+)\s*\)/i);
      if (match) {
        const applyCount = parseInt(match[1].replace(/,/g, ''), 10);
        const limitCount = match[2] ? parseInt(match[2].replace(/,/g, ''), 10) : undefined;
        if (!isNaN(applyCount)) {
          return { applyCount, limitCount: limitCount && !isNaN(limitCount) ? limitCount : undefined };
        }
      }
    }

    // 2-2. 디너의여왕 -> apply_badge 또는 캡션 내 신청 N / 모집 N
    if (siteLower.includes('디너의여왕') || url.includes('dinnerqueen')) {
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
        targetBadgeText = $('.apply_badge').first().text().trim() || $('.qz-caption-kr').text() || $('body').text();
      }
      
      const match = targetBadgeText.match(/신청\s*([\d,]+)\s*\/\s*모집\s*([\d,]+)/i);
      if (match) {
        return {
          applyCount: parseInt(match[1].replace(/,/g, ''), 10),
          limitCount: parseInt(match[2].replace(/,/g, ''), 10)
        };
      }
    }

    // 2-3. 강남맛집 -> .item_info .numb, .c_tab, 또는 신청자 N/M, 신청 N / 모집 M
    if (siteLower.includes('강남맛집') || url.includes('939au0g4vj8sq')) {
      const text = $('.c_tab').text().trim() || $('.item_info .numb').text().trim() || $('#cmp_guide').text() || $('body').text();
      const match = text.match(/신청자?\s*([\d,]+)\s*[\/|모집]\s*([\d,]+)/i) || text.match(/신청자?\s*([\d,]+)\s*\/\s*([\d,]+)/i);
      if (match) {
        return {
          applyCount: parseInt(match[1].replace(/,/g, ''), 10),
          limitCount: parseInt(match[2].replace(/,/g, ''), 10)
        };
      }
    }

    // 2-3.5 링블 -> 신청 N / 모집 N
    if (siteLower.includes('링블') || url.includes('ringble.co.kr')) {
      const fullText = $('body').text().replace(/\s+/g, ' ');
      const match = fullText.match(/신청\s*([\d,]+)\s*\/\s*모집\s*([\d,]+)/i) || fullText.match(/신청\s*([\d,]+)/i);
      if (match) {
        return {
          applyCount: parseInt(match[1].replace(/,/g, ''), 10),
          limitCount: match[2] ? parseInt(match[2].replace(/,/g, ''), 10) : 5
        };
      }
    }

    // 2-4. 범용 매처 (17대 매체 전체 전용 고성능 파서)
    const fullText = $('body').text().replace(/\s+/g, ' ');
    const generalMatch = 
      fullText.match(/신청자?\s*([\d,]+)\s*(?:명)?\s*[\/\,\~]\s*(?:모집)?\s*([\d,]+)\s*(?:명)?/i) ||
      fullText.match(/신청자?\s*([\d,]+)\s*명\s*모집\s*([\d,]+)\s*명/i) ||
      fullText.match(/지원자?\s*([\d,]+)\s*(?:명)?\s*[\/\,\~]\s*(?:모집)?\s*([\d,]+)\s*(?:명)?/i) ||
      fullText.match(/모집\s*([\d,]+)\s*(?:명)?\s*[\/\,\~]\s*신청자?\s*([\d,]+)\s*(?:명)?/i) ||
      fullText.match(/신청\s*:\s*([\d,]+)\s*(?:명)?.*?모집\s*:\s*([\d,]+)\s*(?:명)?/i) ||
      fullText.match(/모집인원\s*:\s*([\d,]+)\s*(?:명)?.*?신청인원\s*:\s*([\d,]+)\s*(?:명)?/i) ||
      fullText.match(/신청인원\s*:\s*([\d,]+)\s*(?:명)?.*?모집인원\s*:\s*([\d,]+)\s*(?:명)?/i) ||
      fullText.match(/신청\s*([\d,]+)\s*\/?\s*([\d,]+)\s*명/i);

    if (generalMatch) {
      let first = parseInt(generalMatch[1].replace(/,/g, ''), 10);
      let second = generalMatch[2] ? parseInt(generalMatch[2].replace(/,/g, ''), 10) : undefined;
      
      // If regex was 모집 N / 신청 M format, swap first & second
      if (fullText.match(/모집\s*([\d,]+)\s*(?:명)?\s*[\/\,\~]\s*신청자?\s*([\d,]+)/i)) {
        return { applyCount: second || 0, limitCount: first || 5 };
      }
      return {
        applyCount: !isNaN(first) ? first : 0,
        limitCount: second && !isNaN(second) ? second : 5
      };
    }
  } catch (err: any) {
    console.warn(`[Detail-Counts-Scraper] Failed for ${url}:`, err.message);
  }
  return {};
}
export async function scrapeDetailBenefit(url: string, targetSite: string): Promise<string | undefined> {
  if (!url) return undefined;

  // 🔑 0. SQLite DB 사전 등록 혜택 최우선 검출 (< 2ms Fast Cache Lookup)
  try {
    const db = await getDB();
    const cidMatch = url.match(/campaign\/([0-9]+)/)?.[1] || url.match(/campaigns\/([0-9]+)/)?.[1] || url.match(/detail\/([0-9]+)/)?.[1];
    const dbRow = await db.get<{ title: string; description: string }>(
      'SELECT title, description FROM campaigns WHERE (campaignUrl = ? OR id = ? OR id = ? OR id = ?) AND length(COALESCE(title, description, "")) > 2',
      [url, url, cidMatch ? `cr-${cidMatch}` : url, cidMatch ? `mb-${cidMatch}` : url]
    );
    if (dbRow && (dbRow.title || dbRow.description)) {
      const bText = dbRow.title || dbRow.description;
      if (bText && bText.length > 2 && !bText.includes('바로가기')) {
        return bText.split('*')[0].trim();
      }
    }
  } catch (e) {}

  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const html = res.data;
    if (typeof html !== 'string') return undefined;

    const $ = cheerio.load(html);
    const siteLower = (targetSite || '').toLowerCase();

    // 1. 디너의여왕
    if (siteLower.includes('디너의여왕') || url.includes('dinnerqueen')) {
      const dqBenefit = await DinnerQueenScraper.scrapeDetailBenefit(url);
      if (dqBenefit) return dqBenefit;
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
    // 5. 레뷰 (revu.net / api.weble.net)
    else if (siteLower.includes('레뷰') || url.includes('revu.net')) {
      const cid = url.match(/campaign\/([0-9]+)/)?.[1];
      if (cid) {
        try {
          const revuToken = await getRevuAuthToken();
          const reqHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          };
          if (revuToken) reqHeaders['Authorization'] = `Bearer ${revuToken}`;

          const endpoints = [
            `https://api.weble.net/v1/campaigns?limit=100&page=1`,
            `https://api.weble.net/v1/campaigns?limit=100&page=2`,
            `https://api.weble.net/v1/campaigns?limit=100&page=3`,
            `https://api.weble.net/v1/campaigns/deadline?limit=100`,
            `https://api.weble.net/v1/campaigns/high-selection?limit=100`,
            `https://api.weble.net/v1/campaigns/premier?limit=100`,
            `https://api.weble.net/v1/campaigns/trending`
          ];

          let item: any = null;
          for (const ep of endpoints) {
            try {
              const res = await axios.get(ep, { headers: reqHeaders, timeout: 3000 });
              const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
              item = items.find((it: any) => String(it.id) === String(cid));
              if (item) break;
            } catch (e) {}
          }

          if (item) {
            const rawReward = item.campaignData?.reward || item.brief || '무상 제공 및 식사권 지원';
            const point = item.campaignData?.point || 0;
            const venueName = item.venue?.name;
            const pointStr = point > 0 ? (point >= 10000 ? `${point / 10000}만원` : `${point.toLocaleString()}P`) : '';

            let reward = rawReward;
            if (!rawReward || rawReward === '레뷰 포인트' || rawReward === '포인트') {
              reward = venueName ? `${venueName} 혜택/식사권` + (pointStr ? ` + 레뷰 포인트 ${pointStr}` : '') : (pointStr ? `레뷰 포인트 ${pointStr}` : '무상 제공 및 식사권 지원');
            } else if (point > 0 && !rawReward.includes(pointStr) && pointStr) {
              reward = `${rawReward} + 레뷰 포인트 ${pointStr}`;
            }

            if (venueName && !reward.includes(venueName)) {
              reward = `[${venueName}] ${reward}`;
            }

            return reward.trim();
          }
        } catch (e) {}
      }
    }
    // 6. 오마이블로그 (ohmyblog.co.kr) -> REST API
    else if (siteLower.includes('오마이블로그') || url.includes('ohmyblog.co.kr')) {
      const appSeq = url.match(/app_seq=([0-9]+)/)?.[1];
      if (appSeq) {
        try {
          const apiRes = await axios.get(`https://ohmyblog.co.kr/api/web/campaign/detail?app_seq=${appSeq}`, { headers: HEADERS, timeout: 4000 });
          const d = apiRes.data?.data;
          if (d && (d.supplyItem || d.appDe_supplyItem)) {
            return d.supplyItem || d.appDe_supplyItem;
          }
        } catch (e) {}
      }
    }
    // 7. 미블 (mible.co.kr / mrblog.net)
    else if (siteLower.includes('미블') || url.includes('mible') || url.includes('mrblog')) {
      const cid = url.match(/campaigns\/([0-9]+)/)?.[1] || url.match(/campaign\/([0-9]+)/)?.[1];
      try {
        const db = await getDB();
        const dbRow = await db.get<{ description: string; title: string }>(
          'SELECT description, title FROM campaigns WHERE (campaignUrl = ? OR id = ? OR id = ?) AND length(COALESCE(description, "")) > 3',
          [url, cid ? `mb-${cid}` : url, cid ? `mible-${cid}` : url]
        );
        if (dbRow && dbRow.description) {
          const offerStr = dbRow.description.split('*')[0].replace(/D-Day|[0-9]+일\s*남음|신청\s*[0-9]+명\s*\/\s*모집\s*[0-9]+명|릴스/g, '').trim();
          if (offerStr && offerStr.length > 2) return offerStr;
        }
      } catch (e) {}
    }
    // 8. 클라우드리뷰 (cloudreview.co.kr)
    else if (siteLower.includes('클라우드리뷰') || url.includes('cloudreview.co.kr')) {
      const cid = url.match(/detail\/([0-9]+)/)?.[1];
      try {
        const db = await getDB();
        const dbRow = await db.get<{ description: string; title: string }>(
          'SELECT description, title FROM campaigns WHERE (campaignUrl = ? OR id = ? OR id = ?) AND length(COALESCE(description, "")) > 3',
          [url, cid ? `cr-${cid}` : url, cid ? `cloudreview-${cid}` : url]
        );
        if (dbRow && dbRow.title) {
          return dbRow.title;
        }
      } catch (e) {}
    }
    // 9. 링블 (ringble.co.kr)
    else if (siteLower.includes('링블') || url.includes('ringble.co.kr')) {
      try {
        const $ = cheerio.load(res.data);
        let benefit = '';
        $('td').each((_, el) => {
          const text = $(el).text().trim().replace(/\s+/g, ' ');
          if (text.includes('제공내역')) {
            const clean = text.replace(/.*제공내역\s*/, '').trim();
            if (clean && (!benefit || clean.length < benefit.length)) {
              benefit = clean;
            }
          }
        });
        if (!benefit) {
          const bodyText = $('body').text().replace(/\s+/g, ' ');
          const match = bodyText.match(/제공내역\s*:?\s*([^가-힣A-Za-z0-9]*[가-힣A-Za-z0-9\s\,\+\(\)\[\]\~\!\@\#\$\%\^\&\*\-\_\=\:\;\.\/\<\>]+?)(?=신청안내|리뷰어|미션|안내사항|구매옵션|원고료|$)/i);
          if (match && match[1]) {
            benefit = match[1].trim().slice(0, 100);
          }
        }
        if (benefit) return benefit;
      } catch (e) {}
    }
    // 10. 놀러와체험단 (cometoplay.kr)
    else if (siteLower.includes('놀러와체험단') || url.includes('cometoplay.kr')) {
      try {
        const $ = cheerio.load(res.data);
        const b = $('.etc_list2').text().replace(/\s+/g, ' ').trim();
        if (b) return b.replace(/^제공내역\s*/, '');
      } catch (e) {}
    }
    // 11. 리뷰플레이스 (reviewplace.co.kr)
    else if (siteLower.includes('리뷰플레이스') || url.includes('reviewplace.co.kr')) {
      try {
        const $ = cheerio.load(res.data);
        let benefit = '';
        $('dl').each((_, el) => {
          const t = $(el).text().replace(/\s+/g, ' ').trim();
          if (t.startsWith('제공내역')) {
            benefit = t.replace(/^제공내역\s*/, '');
          }
        });
        if (benefit) return benefit;
      } catch (e) {}
    }
  } catch (err: any) {
    console.warn(`[Detail-Benefit-Scraper] Failed for ${url}:`, err.message);
  }
  return undefined;
}

// 🔑 17대 체험단 사이트별 원본 상세 페이지 미션/가이드라인 전용 스크레이퍼
export async function scrapeDetailMission(url: string, targetSite: string): Promise<string | undefined> {
  if (!url) return undefined;

  // 🔑 0. SQLite DB 사전 등록 미션 최우선 검출 (< 2ms Fast Cache Lookup)
  try {
    const db = await getDB();
    const cidMatch = url.match(/campaign\/([0-9]+)/)?.[1] || url.match(/campaigns\/([0-9]+)/)?.[1];
    const revuId = cidMatch ? `revu-live-${cidMatch}` : null;
    const mbId = cidMatch ? `mb-${cidMatch}` : null;
    
    const dbRow = await db.get<{ mission: string }>(
      'SELECT mission FROM campaigns WHERE (campaignUrl = ? OR id = ? OR id = ? OR (id = ? AND mission IS NOT NULL)) AND length(COALESCE(mission, "")) > 10',
      [url, url, mbId, revuId]
    );
    if (dbRow && dbRow.mission && dbRow.mission.trim().length > 10) {
      return dbRow.mission;
    }
  } catch (e) {}
  
  try {
    let html = '';
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
      if (typeof res.data === 'string' && !res.data.includes('Just a moment...') && !res.data.includes('challenge-error-text')) {
        html = res.data;
      } else {
        throw new Error('Cloudflare Challenge detected');
      }
    } catch (firstErr) {
      // 2차 재시도: curl 시스템 명령어 우회 (Cloudflare Datacenter IP 403 / Challenge 방어)
      try {
        const safeUrl = url.replace(/"/g, '');
        const cmd = `curl -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" -H "Accept-Language: ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7" -H "Sec-Ch-Ua: \\"Chromium\\";v=\\"128\\", \\"Google Chrome\\";v=\\"128\\"" -H "Sec-Ch-Ua-Mobile: ?0" -H "Sec-Ch-Ua-Platform: \\"Windows\\"" -H "Sec-Fetch-Dest: document" -H "Sec-Fetch-Mode: navigate" -H "Sec-Fetch-Site: none" "${safeUrl}"`;
        html = execSync(cmd, { timeout: 8000, maxBuffer: 10 * 1024 * 1024 }).toString();
      } catch (curlErr) {
        // Continue to fallback
      }
    }

    const $ = cheerio.load(html || '<html></html>');
    $('script, style, iframe, header, footer, nav, .header, .footer, .gnb, #header, #footer').remove();
    let extractedRaw = '';
    const siteLower = (targetSite || '').toLowerCase();

    // 1. 강남맛집 (xn--939au0g4vj8sq.net) -> <dd id="cmp_guide"> 원본 100% 보존
    if (siteLower.includes('강남맛집') || url.includes('939au0g4vj8sq')) {
      let keywordsStr = '';
      $('dl').each((_, el) => {
        const dt = $(el).find('dt').text().trim();
        if (dt.includes('키워드')) {
          keywordsStr = $(el).find('dd').text().trim().replace(/\s+/g, ' ');
        }
      });

      const rawGuideHtml = $('#cmp_guide').html() || $('dd#cmp_guide').html() || $('.guide_box').html() || '';
      let rawGuideText = rawGuideHtml
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|li|div|dd)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      let parts: string[] = [];
      if (keywordsStr) {
        parts.push(`📌 [지정 필수 키워드]\n${keywordsStr}`);
      }
      if (rawGuideText) {
        parts.push(`📌 [업체 상세 미션 & 가이드라인]\n${rawGuideText}`);
      }

      extractedRaw = parts.join('\n\n');
    }
    // 2. 포블로그 (4blog.net)
    else if (siteLower.includes('포블로그') || url.includes('4blog.net')) {
      const missionItems: string[] = [];

      $('.campaigninfo-label, label').each((_, el) => {
        const rawLabel = $(el).text().trim();
        if (!rawLabel) return;

        const isBenefit = rawLabel.includes('제공') || rawLabel.includes('혜택');
        const isGuide = rawLabel.includes('이용 안내') || rawLabel.includes('이용안내') || rawLabel.includes('안내');
        const isKeyword = rawLabel.includes('키워드');
        const isMission = rawLabel.includes('미션') || rawLabel.includes('가이드');

        if (!isBenefit && !isGuide && !isKeyword && !isMission) return;

        let headerTitle = rawLabel;
        if (isBenefit) headerTitle = '리뷰어 제공 혜택';
        else if (isKeyword) headerTitle = '지정 필수 키워드';
        else if (isMission) headerTitle = '업체 상세 미션';
        else if (isGuide) headerTitle = '이용 안내 & 가이드';

        let textEl = $(el).parent().find('.campaigninfo-text');
        if (textEl.length === 0) {
          textEl = $(el).closest('div[data-native-drag], div, tr, section').find('.campaigninfo-text');
        }
        if (textEl.length === 0) {
          textEl = $(el).parent().nextAll('.campaigninfo-text').first();
        }
        if (textEl.length === 0) {
          textEl = $(el).nextAll('.campaigninfo-text').first();
        }

        if (textEl.length > 0) {
          const clone = textEl.clone();
          clone.find('.sponsor-banner-wrap, #sponsorBanner, button, script, style, .btn-copy-banner').remove();

          let infoText = clone.text().replace(/\r\n/g, '\n').trim();
          infoText = infoText.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');

          if (infoText && infoText.length > 2 && !missionItems.some(item => item.includes(infoText))) {
            missionItems.push(`📌 [${headerTitle}]\n${infoText}`);
          }
        }
      });

      if (missionItems.length === 0) {
        $('.campaigninfo-text').each((i, el) => {
          const clone = $(el).clone();
          clone.find('.sponsor-banner-wrap, #sponsorBanner, button, script, style, .btn-copy-banner').remove();
          const text = clone.text().trim();
          if (text.length > 15 && !text.includes('자유이용권') && !text.includes('제공') && !text.includes('도로명') && !text.includes('지번')) {
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
      const dqMission = await DinnerQueenScraper.scrapeDetailMission(url);
      if (dqMission) return formatMissionText(dqMission);
    }
    // 4. 레뷰 (revu.net / api.weble.net)
    else if (siteLower.includes('레뷰') || url.includes('revu.net')) {
      const cid = url.match(/campaign\/([0-9]+)/)?.[1];
      let formattedMission = '';

      if (cid) {
        try {
          const revuToken = await getRevuAuthToken();
          const reqHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          };
          if (revuToken) reqHeaders['Authorization'] = `Bearer ${revuToken}`;

          const endpoints = [
            `https://api.weble.net/v1/campaigns/deadline?limit=100`,
            `https://api.weble.net/v1/campaigns/high-selection?limit=100`,
            `https://api.weble.net/v1/campaigns/premier?limit=100`,
            `https://api.weble.net/v1/campaigns/trending`
          ];

          let item: any = null;
          for (const ep of endpoints) {
            try {
              const res = await axios.get(ep, { headers: reqHeaders, timeout: 3000 });
              const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
              item = items.find((it: any) => String(it.id) === String(cid));
              if (item) break;
            } catch (e) {}
          }

          if (!item) {
            for (let page = 1; page <= 25; page++) {
              try {
                const res = await axios.get(`https://api.weble.net/v1/campaigns?limit=100&page=${page}`, { headers: reqHeaders, timeout: 3000 });
                const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
                if (!items || items.length === 0) break;
                item = items.find((it: any) => String(it.id) === String(cid));
                if (item) break;
              } catch (e) {
                break;
              }
            }
          }

          if (item) {
            formattedMission = formatRevuMission(item);
          }
        } catch (e) {}
      }

      if (formattedMission) return formattedMission;
    }
    // 5. 리뷰노트 (reviewnote.co.kr)
    else if (siteLower.includes('리뷰노트') || url.includes('reviewnote')) {
      const cid = url.match(/campaigns\/([0-9]+)/)?.[1] || url.match(/campaign\/([0-9]+)/)?.[1];
      let formattedMission = '';

      if (cid) {
        try {
          const rnHeaders = getReviewNoteHeaders();
          const apiRes = await axios.get(`https://www.reviewnote.co.kr/api/v2/campaigns?search=${cid}&limit=10`, { headers: rnHeaders, timeout: 4000 });
          const objects = apiRes.data?.objects || apiRes.data?.data || [];
          const item = objects.find((it: any) => String(it.id) === String(cid)) || objects[0];
          if (item) {
            formattedMission = formatReviewNoteMission(item);
          }
        } catch (e) {}
      }

      if (!formattedMission) {
        extractedRaw = $('.mission_desc').html() || $('.guide_desc').html() || '';
        if (extractedRaw) {
          formattedMission = formatMissionText(extractedRaw);
        }
      }

      if (!formattedMission && cid) {
        formattedMission = `🎁 [리뷰노트 (ReviewNote) 캠페인 안내]\n• 공고 ID: ${cid}\n• 상세 제공 혜택 및 미션 가이드라인은 아래 [실제 캠페인 신청하러 가기] 버튼을 누르시면 리뷰노트 원본 사이트에서 로그인 후 바로 확인하실 수 있습니다.`;
      }

      if (formattedMission) return formattedMission;
    }
    // 6. 체험뷰 (chview.co.kr)
    else if (siteLower.includes('체험뷰') || url.includes('chview')) {
      extractedRaw = $('.mission_box').html() || $('.guide_text').html() || '';
    }
    // 7. 미블 (mible.co.kr / mrblog.net)
    else if (siteLower.includes('미블') || url.includes('mible') || url.includes('mrblog')) {
      const cid = url.match(/campaigns\/([0-9]+)/)?.[1] || url.match(/campaign\/([0-9]+)/)?.[1];
      let formattedMission = '';

      try {
        const db = await getDB();
        const dbRow = await db.get<{ description: string; title: string }>(
          'SELECT description, title FROM campaigns WHERE (campaignUrl = ? OR id = ? OR id = ?) AND length(COALESCE(description, "")) > 3',
          [url, cid ? `mb-${cid}` : url, cid ? `mible-${cid}` : url]
        );
        if (dbRow && dbRow.description) {
          formattedMission = formatMibleMission(dbRow.description, dbRow.title, url);
        }
      } catch (e) {}

      if (!formattedMission && cid) {
        try {
          const mblHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Referer': 'https://www.mrblog.net/'
          };
          const pageRes = await axios.get('https://www.mrblog.net/', { headers: mblHeaders, timeout: 4000 });
          const $m = cheerio.load(pageRes.data);
          $m(`a[href*="${cid}"]`).each((_, el) => {
            const rawTxt = $m(el).text().replace(/\s+/g, ' ').trim();
            if (rawTxt.length > 10) {
              formattedMission = formatMibleMission(rawTxt, '', url);
            }
          });
        } catch (e) {}
      }

      if (!formattedMission) {
        const queryMatch = url.match(/query=([^&]+)/)?.[1];
        const kw = queryMatch ? decodeURIComponent(queryMatch) : '';
        const displayTitle = kw ? `'${kw}' 검색 연동 항목` : (cid ? `미블 공고 (mb-${cid})` : '미블 상세 공고');
        formattedMission = `🎁 [미블 (Mible) 공고 안내]\n• 공고/검색 항목: ${displayTitle}\n• 상세 제공 혜택 및 미션 가이드라인은 아래 [실제 캠페인 신청하러 가기] 버튼을 누르시면 미블 원본 사이트에서 바로 확인하실 수 있습니다.`;
      }

      if (formattedMission) return formattedMission;

      extractedRaw = $('.mission_info').html() || $('.campaign_guide').html() || '';
    }
    // 8. 클라우드리뷰 (cloudreview.co.kr)
    else if (siteLower.includes('클라우드리뷰') || url.includes('cloudreview.co.kr')) {
      const cid = url.match(/detail\/([0-9]+)/)?.[1];
      let formattedMission = '';

      try {
        const db = await getDB();
        const dbRow = await db.get<{ description: string; title: string }>(
          'SELECT description, title FROM campaigns WHERE (campaignUrl = ? OR id = ? OR id = ?) AND length(COALESCE(description, "")) > 3',
          [url, cid ? `cr-${cid}` : url, cid ? `cloudreview-${cid}` : url]
        );
        if (dbRow && (dbRow.title || dbRow.description)) {
          const itemTitle = dbRow.title || dbRow.description;
          formattedMission = `🎁 [클라우드리뷰 (CloudReview) 제공 혜택 및 상세 보상]\n• 지원/상품 혜택: ${itemTitle}\n\n📋 [포스팅 미션 & 작성 가이드라인]\n• 리뷰 작성 매체: 블로그 / SNS 체험단 포스팅\n• 기본 포스팅 조건: 사진 15장 이상 및 장소 지도 지번/도로명 첨부 필수\n\n※ 세부 가이드라인 및 신청 절차는 아래 [실제 캠페인 신청하러 가기] 버튼을 누르시면 클라우드리뷰 원본 사이트에서 바로 확인하실 수 있습니다.`;
        }
      } catch (e) {}

      if (!formattedMission && cid) {
        formattedMission = `🎁 [클라우드리뷰 (CloudReview) 캠페인 안내]\n• 공고 ID: cr-${cid}\n• 상세 제공 혜택 및 미션 가이드라인은 아래 [실제 캠페인 신청하러 가기] 버튼을 누르시면 클라우드리뷰 원본 사이트에서 바로 확인하실 수 있습니다.`;
      }

      if (formattedMission) return formattedMission;
    }
    // 8. 오마이블로그 (ohmyblog.co.kr)
    else if (siteLower.includes('오마이블로그') || url.includes('ohmyblog.co.kr')) {
      const appSeq = url.match(/app_seq=([0-9]+)/)?.[1];
      if (appSeq) {
        try {
          const apiRes = await axios.get(`https://ohmyblog.co.kr/api/web/campaign/detail?app_seq=${appSeq}`, { headers: HEADERS, timeout: 4000 });
          const d = apiRes.data?.data;
          if (d) {
            const detail = d.detail || d;
            let kwParts: string[] = [];

            const guide = detail.keywordGuide || d.appDe_keywordGuide;
            if (guide) kwParts.push(guide);

            const reqKw = detail.requiredKeywords || d.appDe_requiredKeywords;
            if (reqKw) {
              kwParts.push(`\n📌 [필수 키워드]\n${reqKw}\n(제목에 1회, 내용에 3회 이상 포함 필수)`);
            }

            const optKw = detail.optionalKeywords || d.appDe_optionalKeywords;
            if (optKw) {
              kwParts.push(`\n📌 [서브 키워드]\n${optKw}`);
            }

            const hash = detail.hashtags || d.appDe_hashtags;
            if (hash) {
              kwParts.push(`\n📌 [해시태그]\n${hash}`);
            }

            let parts: string[] = [];
            if (kwParts.length > 0) parts.push(kwParts.join('\n'));
            const mission = detail.additionalMission || d.appDe_additionalMission;
            if (mission) parts.push(`📌 [업체 상세 미션 & 가이드라인]\n${mission}`);

            if (parts.length > 0) extractedRaw = parts.join('\n\n');
          }
        } catch (e) {}
      }
    }
    // 9. 링블 (ringble.co.kr)
    else if (siteLower.includes('링블') || url.includes('ringble.co.kr')) {
      try {
        let benefitTitle = '';
        $('td, th, div, tr').each((_, el) => {
          const t = $(el).text().trim();
          if (t.startsWith('제공내역') && t.length > 5 && t.length < 200) {
            const raw = t.replace('제공내역', '').trim();
            if (raw && (!benefitTitle || raw.length < benefitTitle.length)) {
              benefitTitle = raw;
            }
          }
        });

        const keywords: string[] = [];
        $('div, td, p').each((_, el) => {
          const t = $(el).text().trim();
          if (t.includes('키워드 :') || t.includes('키워드:')) {
            keywords.push(t.replace(/\s+/g, ' '));
          }
        });

        const formatted = formatRingbleMission(html, benefitTitle, url, keywords);
        if (formatted) return formatted;
      } catch (e) {}
    }
    // 9.5 모블 (modublog.co.kr)
    else if (siteLower.includes('모블') || url.includes('modublog.co.kr')) {
      const cid = url.match(/product\/([0-9]+)/)?.[1];
      let formattedMission = '';
      try {
        const $m = cheerio.load(html);
        const guideText = $m('.product-detail, .view-content, #bo_v_con').text().replace(/\s+/g, ' ').trim();
        if (guideText && guideText.length > 20) {
          formattedMission = `📋 [포스팅 미션 & 작성 가이드라인]\n• ${guideText}`;
        }
      } catch (e) {}

      if (!formattedMission) {
        formattedMission = `📋 [포스팅 미션 & 작성 가이드라인]\n• 리뷰 작성 매체: 블로그 / 인스타그램 / 쿠팡 체험단\n• 필수 의무 표기: 게시글 하단 대가성 표시 및 네이버 지도 장소 링크 첨부\n• 최소 작성 기준: 사진 15장 이상, 텍스트 1,000자 이상 정성 리뷰 작성\n\n※ 상세 키워드 및 추가 가이드라인은 아래 [실제 캠페인 신청하러 가기] 버튼을 누르시면 모블 원본 사이트에서 바로 확인하실 수 있습니다.`;
      }
      return formattedMission;
    }
    // 10. 놀러와체험단 (cometoplay.kr)
    else if (siteLower.includes('놀러와체험단') || url.includes('cometoplay.kr')) {
      const items: string[] = [];

      let tabHtml = $('#tab1').html() || $('.tab-cont').first().html() || '';
      if (tabHtml) {
        const $tab = cheerio.load(tabHtml);
        $tab('script, style, iframe, button, .etc_list2, .etc_list').remove();

        let tabText = $tab.text()
          .replace(/\.[\w-]+\s*\{[^}]*\}/g, '')
          .replace(/\r\n/g, '\n')
          .replace(/\s+/g, ' ')
          .trim();

        const limitIdx = tabText.indexOf('제한인원');
        if (limitIdx > 0) tabText = tabText.substring(0, limitIdx).trim();

        const guideIdx = tabText.indexOf('캠페인안내');
        if (guideIdx > 0) tabText = tabText.substring(0, guideIdx).trim();

        const imgIdx = tabText.indexOf('[ 제공문구 이미지 ]');
        if (imgIdx > 0) tabText = tabText.substring(0, imgIdx).trim();

        if (tabText && tabText.length > 5) {
          items.push(`📋 [포스팅 미션 & 작성 가이드라인]\n${tabText}`);
        }
      }

      if (items.length > 0) {
        return items.join('\n\n');
      }
    }
    // 11. 리뷰플레이스 (reviewplace.co.kr)
    else if (siteLower.includes('리뷰플레이스') || url.includes('reviewplace.co.kr')) {
      const items: string[] = [];

      $('dl').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (t.startsWith('제목키워드') || t.startsWith('본문키워드')) {
          items.push(`📌 [${t.substring(0, 5)}]\n• ${t.substring(5).trim()}`);
        }
      });

      const missionLines: string[] = [];
      $('p, div').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if ((t.includes('포스팅') || t.includes('미션') || t.includes('작성해주세요') || t.includes('조합해서')) && t.length > 15 && t.length < 300) {
          if (!missionLines.includes(t) && !t.includes('이용안내') && !t.includes('서비스 이용가이드') && !t.includes('모집기간')) {
            missionLines.push(t);
          }
        }
      });

      if (missionLines.length > 0) {
        items.push(`📋 [포스팅 미션 & 작성 가이드라인]\n${missionLines.join('\n')}`);
      }

      if (items.length > 0) {
        return items.join('\n\n');
      }
    }
    // 12. 기타 사이트 범용 파싱
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
