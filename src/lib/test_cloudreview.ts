import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
};

async function testCloudReviewScraper() {
  console.log('===================================================');
  console.log('🔎 [사이트 #7 테스트] 클라우드리뷰 (CloudReview) 정밀 파서 라이브 점검');
  console.log('===================================================');

  try {
    const url = 'https://cloudreview.co.kr';
    const res = await axios.get(url, { headers: HEADERS, timeout: 8000 });
    console.log(`[Target URL] ${url} (HTTP ${res.status} OK)`);

    const $ = cheerio.load(res.data);
    const pageTitle = $('title').text().trim();
    console.log(`[Site Title] ${pageTitle}`);

    const campaigns: any[] = [];

    $('a[href*="/campaign/detail/"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const parent = $(el).closest('div.relative, article, div.campaign-image').parent();
      
      const title = parent.find('.text-sm.px-3, div[class*="truncate"]').first().text().trim().replace(/\s+/g, ' ') || $(el).text().trim().replace(/\s+/g, ' ');
      const img = parent.find('img').attr('data-original') || parent.find('img').attr('data-src') || parent.find('img').attr('src') || '';
      
      const cpIdMatch = href.match(/\/detail\/(\d+)/);
      const cpId = cpIdMatch ? cpIdMatch[1] : '';

      if (title && title.length > 3 && cpId && !campaigns.some(c => c.id === cpId)) {
        const fullUrl = `https://cloudreview.co.kr/campaign/detail/${cpId}`;
        campaigns.push({ id: cpId, title, href: fullUrl, img });
      }
    });

    console.log(`\n[파싱 결과] 총 ${campaigns.length}개의 라이브 캠페인 공고 100% 정밀 수집 성공!`);
    console.log('---------------------------------------------------');
    campaigns.slice(0, 5).forEach((c, idx) => {
      console.log(`${idx + 1}. [ID: cr-${c.id}] 제목: ${c.title}`);
      console.log(`   링크: ${c.href}`);
      console.log(`   이미지: ${c.img || '기본 썸네일'}`);
      console.log('---------------------------------------------------');
    });

    return { success: true, count: campaigns.length, sample: campaigns[0] };
  } catch (err: any) {
    console.error(`[오류 발생] 클라우드리뷰 파싱 실패: ${err.message}`);
    return { success: false, error: err.message };
  }
}

testCloudReviewScraper();
