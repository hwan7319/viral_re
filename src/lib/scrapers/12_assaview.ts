import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedCampaign, SiteScraper } from './types';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
};

function detectPlatform(title: string, desc: string): string {
  const text = (title + ' ' + desc).toLowerCase();
  if (text.includes('인스타') || text.includes('instagram') || text.includes('릴스') || text.includes('reels')) return 'instagram';
  if (text.includes('유튜브') || text.includes('youtube') || text.includes('쇼츠') || text.includes('shorts')) return 'youtube';
  if (text.includes('쿠팡') || text.includes('스마트스토어') || text.includes('구매평') || text.includes('구매형') || text.includes('스토어')) return 'coupang';
  if (text.includes('기자단')) return 'reporter';
  return 'blog';
}

function detectCategory(title: string, desc: string): string {
  const text = (title + ' ' + desc).toLowerCase();
  if (text.includes('카페') || text.includes('디저트') || text.includes('베이커리') || text.includes('빵') || text.includes('음료') || text.includes('커피')) return 'food-cafe';
  if (text.includes('술집') || text.includes('주점') || text.includes('와인') || text.includes('맥주') || text.includes('하이볼') || text.includes('이자카야')) return 'food-pub';
  if (text.includes('마라탕') || text.includes('중식') || text.includes('훠궈') || text.includes('짜장') || text.includes('짬뽕')) return 'food-chinese';
  if (text.includes('일식') || text.includes('초밥') || text.includes('스시') || text.includes('돈까스')) return 'food-japanese';
  if (text.includes('양식') || text.includes('파스타') || text.includes('스테이크') || text.includes('피자') || text.includes('버거')) return 'food-western';
  if (text.includes('삼겹살') || text.includes('고기') || text.includes('한식') || text.includes('한우') || text.includes('갈비') || text.includes('치킨') || text.includes('해물') || text.includes('아구찜') || text.includes('식사권') || text.includes('체험권')) return 'food-korean';
  if (text.includes('화장품') || text.includes('크림') || text.includes('뷰티') || text.includes('피부') || text.includes('에스테틱') || text.includes('헤어') || text.includes('미용실') || text.includes('샴푸')) return 'beauty-skin';
  return 'life-goods';
}

function isDummyCampaign(title: string, desc: string): boolean {
  const t = title.toLowerCase().trim();
  const d = desc.toLowerCase().trim();
  if (t === 'test' || t === 'dummy' || t === 'mock' || t === '참여 조건' || t === '참여조건') return true;
  if (t.includes('[1원 상당] test') || t.includes('test [1원') || (t.includes('test') && d.includes('1원'))) return true;
  if (t.length < 2) return true;
  return false;
}

export const AssaViewScraper: SiteScraper = {
  siteName: '아싸뷰',

  async scrapeList(keyword?: string): Promise<ScrapedCampaign[]> {
    const collected: ScrapedCampaign[] = [];
    const now = new Date();
    const maxPages = keyword ? 5 : 30;

    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = `https://assaview.co.kr/campaign_list.php?page=${page}${keyword ? `&search=${encodeURIComponent(keyword)}` : ''}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 8000 });
        const $ = cheerio.load(res.data);

        let countOnPage = 0;

        $('a[href*="campaign.php?cp_id="]').each((i, el) => {
          const href = $(el).attr('href') || '';
          const cpIdMatch = href.match(/cp_id=(\d+)/);
          if (!cpIdMatch) return;
          const cpId = cpIdMatch[1];

          const parent = $(el).closest('li, a, div.item, div.card');
          const subjectText = parent.find('.subject').text().trim().replace(/\s+/g, ' ');
          const optNameText = parent.find('.opt_name').text().trim().replace(/\s+/g, ' ');
          const chipText = parent.find('.rs_cp_type_chip').text().trim();
          const iconSrc = parent.find('.review_type_icon').attr('src') || '';

          let title = subjectText || optNameText;
          let description = optNameText || subjectText;

          if (!title || title === '참여 조건') {
            const rawText = parent.find('.details').text().replace(/\s+/g, ' ').trim();
            title = rawText.replace(/방문형|배송형|구매형|신청.*$/gi, '').trim();
          }

          title = title.replace(/\d{4}\/\d{2}\/\d{2}\s*\d{2}:\d{2}:\d{2}/gi, '').trim();

          if (isDummyCampaign(title, description)) return;

          let platform = detectPlatform(title, description);
          if (iconSrc.includes('reels_icon') || iconSrc.includes('insta')) platform = 'instagram';
          else if (iconSrc.includes('clip')) platform = 'clip';
          else if (chipText.includes('인스타')) platform = 'instagram';

          const category = detectCategory(title, description);

          let img = parent.find('.imgBox img').attr('src') || parent.find('img').attr('src') || '';
          if (img && !img.startsWith('http')) {
            img = `https://assaview.co.kr/${img.replace(/^\.\//, '')}`;
          }

          const applyMatch = parent.find('.desc b').text().trim();
          const limitMatch = parent.find('.desc').text().match(/\/ (\d+)명/);
          const applyCount = parseInt(applyMatch, 10) || 0;
          const limitCount = limitMatch ? parseInt(limitMatch[1], 10) : 5;

          if (keyword && !title.toLowerCase().includes(keyword.toLowerCase()) && !description.toLowerCase().includes(keyword.toLowerCase())) return;

          if (title && title.length > 2 && !collected.some(c => c.id === `assaview-${cpId}`)) {
            countOnPage++;
            collected.push({
              id: `assaview-${cpId}`,
              title: title.slice(0, 80),
              description: description || title,
              platform,
              category,
              campaignUrl: `https://assaview.co.kr/campaign.php?cp_id=${cpId}`,
              imageUrl: img || 'https://viral-re.co.kr/icon.png',
              targetSite: '아싸뷰',
              limitCount,
              applyCount,
              startDate: now.toISOString().split('T')[0],
              endDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
              createdAt: now.toISOString(),
              updatedAt: now.toISOString()
            });
          }
        });

        if (countOnPage === 0) break;
      } catch (e) {
        break;
      }
    }

    return collected;
  },

  async scrapeDetailBenefit(url: string): Promise<string | undefined> {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 8000 });
      const $ = cheerio.load(res.data);

      $('script, style, iframe, header, footer, nav').remove();

      let benefit = '';

      $('option, .option_list, .cp_option').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text && !text.includes('옵션을 선택') && !text.includes('개인정보') && (text.includes('상당') || text.includes('배송비') || text.includes('이용권') || text.includes('제공') || text.includes('원]'))) {
          if (!benefit || text.length > benefit.length) {
            benefit = text;
          }
        }
      });

      if (!benefit) {
        $('div, tr, td, p').each((_, el) => {
          const text = $(el).clone().children().remove().end().text().trim();
          if (text.includes('원 상당]') || text.includes('배송비 포함') || text.includes('이용권')) {
            if (!benefit || (text.length > 5 && text.length < 150)) {
              let clean = text.replace(/옵션을 선택해주세요|선택하세요|-->/g, '').trim();
              if (clean && !clean.includes('개인정보') && !clean.includes('function')) {
                benefit = clean;
              }
            }
          }
        });
      }

      if (!benefit) {
        const bodyText = $('body').text().replace(/\s+/g, ' ');
        const match = bodyText.match(/\[([\d,]+원\s*상당\][^\n\r]*?)(?=\s*공유하기|신청|옵션|$)/i) || bodyText.match(/진행옵션\s*([\s\S]*?)(?=옵션을|공유하기|신청|$)/i);
        if (match && match[1]) {
          let clean = match[1].replace(/[\d,]+\s*명\s*모집|진행옵션/g, '').trim();
          if (clean && !clean.includes('개인정보')) {
            benefit = clean;
          }
        }
      }

      if (!benefit) {
        const title = $('h1, h2, .cp_title, .title').first().text().trim().replace(/\s+/g, ' ');
        if (title && !title.includes('개인정보')) benefit = title;
      }

      return benefit ? benefit.slice(0, 150).trim() : undefined;
    } catch (e) {
      return undefined;
    }
  },

  async scrapeDetailMission(url: string): Promise<string | undefined> {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 8000 });
      const $ = cheerio.load(res.data);

      $('script, style, iframe, header, footer, nav').remove();

      const sections: string[] = [];
      const fullHtml = $('body').html() || '';
      const convertedText = fullHtml
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');

      const lines = convertedText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.includes('-->'));

      let benefitStr = '';
      let addressStr = '';
      let timeStr = '';
      let noteStr = '';
      let titleKwStr = '';
      let bodyKwStr = '';

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if ((l.includes('원 상당]') || l.includes('배송비 포함')) && !l.includes('개인정보')) {
          if (!benefitStr && l.length < 150) benefitStr = l;
        }
        if (l.startsWith('매장 주소 :') || l.startsWith('매장 주소:')) addressStr = l.replace(/^매장 주소\s*:\s*/, '').trim();
        if (l.startsWith('방문 가능 시간 :') || l.startsWith('방문 가능 시간:')) timeStr = l.replace(/^방문 가능 시간\s*:\s*/, '').trim();
        if (l.startsWith('방문 참고 사항 :') || l.startsWith('방문 참고 사항:')) noteStr = l.replace(/^방문 참고 사항\s*:\s*/, '').trim();
        if (l === '제목 키워드' && i + 2 < lines.length) titleKwStr = lines[i + 2];
        if (l === '본문 키워드' && i + 2 < lines.length) bodyKwStr = lines[i + 2];
      }

      if (benefitStr) sections.push(`🎁 [제공내역]\n• ${benefitStr}`);

      if (addressStr || timeStr || noteStr) {
        let locSection = '📍 [체험 장소 및 방문/예약 안내]';
        if (addressStr) locSection += `\n• 매장 주소: ${addressStr}`;
        if (timeStr) locSection += `\n• 방문 가능 시간: ${timeStr}`;
        if (noteStr) locSection += `\n• 방문 참고 사항: ${noteStr}`;
        sections.push(locSection);
      }

      if (titleKwStr || bodyKwStr) {
        let kwSection = '📌 [지정 필수 키워드]';
        if (titleKwStr) kwSection += `\n• 제목 키워드: ${titleKwStr}`;
        if (bodyKwStr) kwSection += `\n• 본문 키워드: ${bodyKwStr}`;
        sections.push(kwSection);
      }

      // Extract Mission Guidelines
      const missionLines: string[] = [];
      let isMissionSection = false;

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (l.includes('블로그 미션') || l.includes('인스타 미션') || l.includes('미션 가이드')) {
          isMissionSection = true;
          if (l.includes('미션')) missionLines.push(`[${l}]`);
          continue;
        }
        if (l.includes('캠페인 유의') || l.includes('신청 전 필수') || l.includes('SNS 정보')) {
          isMissionSection = false;
          continue;
        }

        if (isMissionSection) {
          if (l.includes('✓') || l.includes('공유하기') || l.includes('url 복사')) continue;
          let clean = l.replace(/^[\-\*•\:]\s*/, '').trim();
          if (clean && clean.length > 2) {
            missionLines.push(clean.startsWith('•') || clean.startsWith('[') || /^\d+\./.test(clean) ? clean : `• ${clean}`);
          }
        }
      }

      if (missionLines.length > 0) {
        sections.push(`📋 [포스팅 미션 & 작성 가이드라인]\n${missionLines.join('\n')}`);
      }

      return sections.join('\n\n') || undefined;
    } catch (e) {
      return undefined;
    }
  }
};
