import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedCampaign, SiteScraper } from './types';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

export const ReviewPlaceScraper: SiteScraper = {
  siteName: '리뷰플레이스',

  async scrapeList(keyword?: string): Promise<ScrapedCampaign[]> {
    const res = await axios.get('https://www.reviewplace.co.kr/pr/', { headers: HEADERS, timeout: 6000 });
    const $ = cheerio.load(res.data);
    const collected: ScrapedCampaign[] = [];
    const now = new Date();

    $('a[href*="/pr/?id="]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const parent = $(el).closest('div, li, tr');
      let rawTitle = $(el).text().trim().replace(/\s+/g, ' ') || parent.text().trim().replace(/\s+/g, ' ');
      if (keyword && !rawTitle.toLowerCase().includes(keyword.toLowerCase())) return;

      let img = $(el).find('img').attr('src') || parent.find('img').attr('src') || '';
      if (img && img.startsWith('//')) img = 'https:' + img;

      const numMatch = href.match(/id=(\d+)/);
      const cpId = numMatch ? numMatch[1] : `${i}`;

      let platform = 'blog';
      if (rawTitle.includes('인스타') || rawTitle.includes('릴스')) platform = 'instagram';
      else if (rawTitle.includes('기자단')) platform = 'reporter';
      else if (rawTitle.includes('스마트스토어') || rawTitle.includes('구매평')) platform = 'coupang';

      if (rawTitle && rawTitle.length > 3) {
        collected.push({
          id: `rp-${cpId}`,
          title: rawTitle.slice(0, 70),
          description: '',
          platform,
          category: 'general',
          campaignUrl: href.startsWith('http') ? href : `https://www.reviewplace.co.kr${href.startsWith('/') ? '' : '/'}${href}`,
          imageUrl: img || 'https://viral-re.co.kr/icon.png',
          targetSite: '리뷰플레이스',
          limitCount: 5,
          applyCount: 0,
          startDate: now.toISOString().split('T')[0],
          endDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
    });

    return collected;
  },

  async scrapeDetailBenefit(url: string): Promise<string | undefined> {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 6000 });
      const $ = cheerio.load(res.data);

      // 1. Receipt / Hotdeal coupon card
      const couponCard = $('.rp-receipt-detail__coupon-card').text().replace(/\s+/g, ' ').trim();
      if (couponCard) {
        const targetMatch = couponCard.match(/할인대상\s*:?\s*([^이용방법쿠폰]*)/i);
        const benefitMatch = couponCard.match(/핫딜\s*혜택\s*:?\s*([^매장명할인대상]*)/i);
        
        const targetText = targetMatch ? targetMatch[1].trim() : '';
        const benefitText = benefitMatch ? benefitMatch[1].trim() : '';
        
        if (targetText && benefitText) return `${benefitText} (${targetText})`;
        if (benefitText) return benefitText;
        if (targetText) return targetText;
      }

      // 2. Standard ReviewPlace campaign: 제공내역
      let benefit = '';

      // Direct text under .pr_info or dt/dd
      $('dt, th, div, td').each((_, el) => {
        const text = $(el).text().trim();
        if (text === '제공내역' || text.startsWith('제공내역')) {
          const next = $(el).next().text().trim() || $(el).parent().find('dd, td, .txt, .desc').text().trim();
          if (next && next !== '제공내역' && (!benefit || next.length > benefit.length)) {
            benefit = next.replace(/\s+/g, ' ').trim();
          }
        }
      });

      if (!benefit) {
        const fullText = $('body').text().replace(/\s+/g, ' ');
        const match = fullText.match(/제공내역\s*([^방문주소제목키워드본문키워드캠페인안내리뷰어미션]*)/i);
        if (match && match[1]) {
          benefit = match[1].trim().slice(0, 150);
        }
      }

      return benefit ? benefit.replace(/-->/g, '').trim() : undefined;
    } catch (e) {
      return undefined;
    }
  },

  async scrapeDetailMission(url: string): Promise<string | undefined> {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 6000 });
      const $ = cheerio.load(res.data);

      $('script, style, iframe, header, footer, nav, #hd, #ft, .header_wrap, .footer_wrap').remove();

      const sections: string[] = [];

      // 1. Hotdeal / Receipt coupon page
      const couponCard = $('.rp-receipt-detail__coupon-card').text().replace(/\s+/g, ' ').trim();
      if (couponCard) {
        const targetMatch = couponCard.match(/할인대상\s*:?\s*([^이용방법쿠폰]*)/i);
        const benefitMatch = couponCard.match(/핫딜\s*혜택\s*:?\s*([^매장명할인대상]*)/i);
        const fullText = $('body').text();
        const addressMatch = fullText.match(/주소\s*:?\s*([^\n\r연락처전화번호예약이용]+)/i);
        const bookingMatch = fullText.match(/예약\s*안내\s*:?\s*([^\n\r전화번호이용안내]+)/i);

        if (benefitMatch || targetMatch) {
          const b = benefitMatch ? benefitMatch[1].trim() : '';
          const t = targetMatch ? targetMatch[1].trim() : '';
          sections.push(`🎁 [제공혜택]\n• ${b} ${t ? `(${t})` : ''}`.trim());
        }
        if (addressMatch || bookingMatch) {
          let locStr = '📍 [체험 장소 및 방문/예약 안내]';
          if (addressMatch) locStr += `\n• 방문 주소: ${addressMatch[1].trim()}`;
          if (bookingMatch) locStr += `\n• 예약 안내: ${bookingMatch[1].trim()}`;
          sections.push(locStr);
        }

        const reviewGuide = $('.rp-receipt-detail__guide').text().replace(/\s+/g, ' ').trim();
        if (reviewGuide) {
          let gStr = '📋 [필수 리뷰 미션 & 가이드라인]';
          const reqMatch = reviewGuide.match(/필수\s*리뷰\s*제출\s*([^리뷰가이드]*)/i);
          const guideMatch = reviewGuide.match(/리뷰\s*가이드\s*(.*)/i);
          if (reqMatch) gStr += `\n• 리뷰 제출 매체: ${reqMatch[1].trim()}`;
          if (guideMatch) gStr += `\n• 리뷰 가이드: ${guideMatch[1].trim()}`;
          sections.push(gStr);
        }

        return sections.join('\n\n') || undefined;
      }

      // 2. Standard ReviewPlace detail page
      const rawHtml = $('body').html() || '';
      const convertedText = rawHtml
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
      let titleKwStr = '';
      let bodyKwStr = '';

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (l === '제공내역' && i + 1 < lines.length && !lines[i + 1].includes('-->')) benefitStr = lines[i + 1];
        else if (l === '방문주소' && i + 1 < lines.length && !lines[i + 1].includes('-->')) addressStr = lines[i + 1];
        else if (l === '제목키워드' && i + 1 < lines.length && !lines[i + 1].includes('-->')) titleKwStr = lines[i + 1];
        else if (l === '본문키워드' && i + 1 < lines.length && !lines[i + 1].includes('-->')) bodyKwStr = lines[i + 1];
      }

      if (benefitStr) sections.push(`🎁 [제공내역]\n• ${benefitStr}`);
      if (addressStr && !addressStr.includes('캠페인 참여시')) sections.push(`📍 [체험 장소 및 방문 주소]\n• ${addressStr}`);
      if (titleKwStr || bodyKwStr) {
        let kwSection = '📌 [지정 필수 키워드]';
        if (titleKwStr) kwSection += `\n• 제목 키워드: ${titleKwStr}`;
        if (bodyKwStr) kwSection += `\n• 본문 키워드: ${bodyKwStr}`;
        sections.push(kwSection);
      }

      // Guide & Mission Lines
      const guideLines: string[] = [];
      const missionLines: string[] = [];
      let isGuideSection = false;
      let isMissionSection = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('캠페인 안내') || line.includes('방문 안내') || line.includes('예약 안내')) {
          isGuideSection = true;
          isMissionSection = false;
          continue;
        }
        if (line.includes('리뷰어 미션') || line.includes('[블로그 미션]') || line.includes('[인스타 미션]') || line.includes('[릴스 미션]')) {
          isGuideSection = false;
          isMissionSection = true;
          if (line.startsWith('[')) {
            missionLines.push(line);
          }
          continue;
        }
        if (line.includes('캠페인 추가정보') || line.includes('모집기간') || line.includes('캠페인 참여시')) {
          isGuideSection = false;
          isMissionSection = false;
          continue;
        }

        if (isGuideSection) {
          if (line.includes('공정위 대가성') || line.includes('키워드 중 1개를') || line.includes('상세 이미지 더보기')) continue;
          let clean = line.replace(/^[\-\*•\:]\s*/, '').trim();
          if (clean && clean.length > 2) {
            guideLines.push(clean.startsWith('•') || /^\d+\./.test(clean) ? clean : `• ${clean}`);
          }
        }

        if (isMissionSection) {
          if (line.includes('키워드') || line.includes('링크 삽입') || line.includes('1,000자 이상') || line.includes('15장 이상') || line.includes('동영상 첨부') || line.includes('미션이 지켜지지 않을')) continue;
          let clean = line.replace(/^[\-\*•\:]\s*/, '').trim();
          if (clean && clean.length > 2) {
            missionLines.push(clean.startsWith('•') || clean.startsWith('[') || /^\d+\./.test(clean) ? clean : `• ${clean}`);
          }
        }
      }

      if (guideLines.length > 0) {
        sections.push(`⏰ [방문 & 예약 가이드라인]\n${guideLines.join('\n')}`);
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
