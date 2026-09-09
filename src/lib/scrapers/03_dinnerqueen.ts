import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedCampaign, SiteScraper } from './types';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function detectPlatform(title: string, desc: string): string {
  const text = (title + ' ' + desc).toLowerCase();
  if (text.includes('인스타') || text.includes('instagram') || text.includes('릴스') || text.includes('reels')) return 'instagram';
  if (text.includes('유튜브') || text.includes('youtube') || text.includes('쇼츠') || text.includes('shorts')) return 'youtube';
  if (text.includes('쿠팡') || text.includes('스마트스토어') || text.includes('구매평') || text.includes('구매') || text.includes('스토어')) return 'coupang';
  if (text.includes('기자단')) return 'reporter';
  return 'blog';
}

function detectCategory(title: string, desc: string): string {
  const text = (title + ' ' + desc).toLowerCase();
  if (text.includes('카페') || text.includes('디저트') || text.includes('베이커리') || text.includes('빵') || text.includes('음료') || text.includes('커피')) return 'food-cafe';
  if (text.includes('술집') || text.includes('주점') || text.includes('와인') || text.includes('맥주') || text.includes('하이볼')) return 'food-pub';
  if (text.includes('마라탕') || text.includes('중식') || text.includes('짜장') || text.includes('짬뽕')) return 'food-chinese';
  if (text.includes('일식') || text.includes('초밥') || text.includes('스시') || text.includes('이자카야') || text.includes('돈까스')) return 'food-japanese';
  if (text.includes('양식') || text.includes('파스타') || text.includes('스테이크') || text.includes('피자') || text.includes('수제버거')) return 'food-western';
  if (text.includes('삼겹살') || text.includes('고기') || text.includes('한식') || text.includes('한우') || text.includes('갈비') || text.includes('치킨') || text.includes('해물') || text.includes('아구찜') || text.includes('식사권') || text.includes('체험권')) return 'food-korean';
  if (text.includes('화장품') || text.includes('크림') || text.includes('뷰티') || text.includes('피부') || text.includes('에스테틱')) return 'beauty-skin';
  return 'life-goods';
}

function parseRemainDaysToDate(days: number): string {
  const now = new Date();
  const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return targetDate.toISOString().split('T')[0];
}

export const DinnerQueenScraper: SiteScraper = {
  siteName: '디너의여왕',

  async scrapeList(keyword?: string): Promise<ScrapedCampaign[]> {
    const res = await axios.get('https://dinnerqueen.net/taste', { headers: HEADERS, timeout: 6000 });
    const $ = cheerio.load(res.data);
    const collected: ScrapedCampaign[] = [];
    const now = new Date();

    $('.qz-dq-card').each((i, el) => {
      const href = $(el).find('a[href*="/taste/"]').attr('href') || '';
      const cpIdMatch = href.match(/\/taste\/(\d+)/);
      const cpId = cpIdMatch ? cpIdMatch[1] : '';

      const title = $(el).find('p.qz-body2-kr.ellipsis.color-title').text().trim().replace(/\s+/g, ' ');
      let offerBenefit = $(el).find('p.qz-caption-kr.color-placeholder.ellipsis').text().trim().replace(/\s+/g, ' ');

      if (title && title.length > 2 && cpId) {
        if (keyword && !title.toLowerCase().includes(keyword.toLowerCase())) return;

        const cleanTitle = title;
        let cleanDesc = offerBenefit;
        if (!cleanDesc || cleanDesc === cleanTitle || cleanDesc.includes(cleanTitle.replace(/^\[[^\]]+\]\s*/, ''))) {
          cleanDesc = '';
        }

        let img = $(el).find('img').attr('data-original') || $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        if (img && img.startsWith('//')) img = 'https:' + img;

        const fullSearchText = `${cleanTitle} ${cleanDesc}`;

        collected.push({
          id: `dq-${cpId}`,
          title: cleanTitle,
          description: cleanDesc,
          platform: detectPlatform(fullSearchText, fullSearchText),
          category: detectCategory(fullSearchText, fullSearchText),
          campaignUrl: `https://dinnerqueen.net/taste/${cpId}`,
          imageUrl: img || 'https://viral-re.co.kr/icon.png',
          targetSite: '디너의여왕',
          limitCount: 5,
          applyCount: 0,
          startDate: now.toISOString().split('T')[0],
          endDate: parseRemainDaysToDate(7),
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

      let offerBenefit = '';
      $('div').each((_, el) => {
        const text = $(el).clone().children().remove().end().text().trim();
        if (text.includes('제공 내역') || text.includes('제공내역')) {
          const parent = $(el).parent();
          const pText = parent.find('p.qz-body-kr, p.qz-body2-kr').first().text().trim();
          if (pText && (!offerBenefit || pText.length < offerBenefit.length)) {
            offerBenefit = pText;
          }
        }
      });

      if (!offerBenefit) {
        offerBenefit = $('.qz-collapse__content p.qz-body-kr').first().text().trim();
      }

      return offerBenefit || undefined;
    } catch (e) {
      return undefined;
    }
  },

  async scrapeDetailMission(url: string): Promise<string | undefined> {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 6000 });
      const $ = cheerio.load(res.data);

      const fullMissionText = $('.qz-collapse__content').map((_, el) => $(el).text()).get().join('\n');
      if (!fullMissionText) return undefined;

      const lines = fullMissionText.split(/\n+/);
      const cleanLines: string[] = [];

      for (let line of lines) {
        line = line.trim().replace(/\s+/g, ' ');
        if (!line) continue;

        // Filter out site headers, navbars, categories, dates, and region links
        if (line.match(/^(?:전체|클립형|릴스형|배송|맛집|지역|배달|여가|뷰티|페이백|기자단|기타|서울|경기|전국|인천|부천|대구|부산|광주|강원|제주|발표 날짜|리뷰 기간|\d{2}\.\d{2}\.\d{2})/i)) continue;
        if (line.includes('지역 캠페인') || line.includes('신청 기간') || line.includes('일정보기') || line.includes('/') || line.includes('건대') || line.includes('강남')) continue;

        // Filter out offer benefit header & offer benefit content lines
        if (/^(?:제공\s*내역|제공내역|제공\s*혜택|제공혜택|제공\s*상품|지원\s*혜택)/i.test(line)) continue;
        if (line.includes('추가금액 본인부담') || line.includes('중복 체험은 불가능') || line.includes('진행하실 SNS') || line.includes('1인 방문시 반값') || line.includes('포장체험불가')) continue;
        if (/\d+(?:만|천)?원\s*(?:식사권|체험권|지원|제공)/i.test(line) && line.length < 100) continue;

        cleanLines.push(line);
      }

      const finalMission = Array.from(new Set(cleanLines)).join('\n').trim();
      return finalMission || undefined;
    } catch (e) {
      return undefined;
    }
  }
};
