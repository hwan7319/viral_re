import axios from 'axios';
import * as cheerio from 'cheerio';

const STEALTH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1'
};

export async function scrapeRevuLive(keyword: string) {
  console.log(`🔍 [REVU LIVE SCRAPER] 레뷰 원본 사이트 비로그인 실시간 공고 수집 시도 (키워드: ${keyword})...`);
  try {
    const encoded = encodeURIComponent(keyword);
    const searchUrl = `https://www.revu.net/campaign/search?q=${encoded}`;
    const res = await axios.get(searchUrl, { headers: STEALTH_HEADERS, timeout: 7000 });
    const $ = cheerio.load(res.data);
    const campaigns: any[] = [];

    $('.campaign-list-item, .card-item, .campaign-card').each((i, el) => {
      const title = $(el).find('.title, .campaign-title, h3').text().trim();
      const href = $(el).find('a').attr('href') || '';
      const campaignUrl = href.startsWith('http') ? href : `https://www.revu.net${href}`;
      const img = $(el).find('img').attr('src') || '';
      
      if (title && campaignUrl) {
        campaigns.push({
          title,
          campaignUrl,
          imageUrl: img,
          targetSite: '레뷰 (REVU)'
        });
      }
    });

    console.log(`✅ [REVU LIVE SCRAPER] 실시간 수집 성공! 수집 건수: ${campaigns.length}건`);
    return campaigns;
  } catch (err: any) {
    console.warn(`⚠️ [REVU LIVE SCRAPER] Cloudflare 차단 응답: ${err.message}`);
    return [];
  }
}

scrapeRevuLive('치킨');
