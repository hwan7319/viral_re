import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
};

const TEST_URLS = [
  { site: '링블', url: 'https://www.ringble.co.kr' },
  { site: '놀러와체험단', url: 'https://www.cometoplay.kr' },
  { site: '오마이블로그', url: 'https://ohmyblog.co.kr' },
  { site: '에코블로그', url: 'https://echoblog.net' },
  { site: '리뷰플레이스', url: 'https://www.reviewplace.co.kr' },
  { site: '모블 (모두의블로그)', url: 'https://www.modublog.co.kr' },
  { site: '체험단모아 (모아뷰)', url: 'https://moaview.co.kr' }
];

async function testDomains() {
  for (const item of TEST_URLS) {
    console.log(`\n===================================================`);
    console.log(`🔎 [테스트] ${item.site} -> ${item.url}`);
    try {
      const res = await axios.get(item.url, { headers: HEADERS, timeout: 8000 });
      console.log(`[HTTP Status] ${res.status} OK`);
      const $ = cheerio.load(res.data);
      const title = $('title').text().trim();
      console.log(`[Site Title] ${title}`);

      const campaigns: any[] = [];

      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const parent = $(el).closest('div, li, article');
        let text = $(el).text().trim().replace(/\s+/g, ' ');
        if (!text || text.length < 5) text = parent.text().trim().replace(/\s+/g, ' ');
        let img = $(el).find('img').attr('data-original') || $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || parent.find('img').attr('src') || '';

        if (href.includes('detail') || href.includes('item') || href.includes('product') || href.includes('campaign') || href.includes('view') || href.includes('cp')) {
          if (text && text.length > 5 && !text.includes('로그인') && !text.includes('회원가입') && !campaigns.some(c => c.href === href)) {
            const fullUrl = href.startsWith('http') ? href : `${item.url}${href.startsWith('/') ? '' : '/'}${href}`;
            if (img && img.startsWith('//')) img = 'https:' + img;
            if (img && !img.startsWith('http')) img = `${item.url}${img.startsWith('/') ? '' : '/'}${img}`;
            campaigns.push({ title: text.slice(0, 50), href: fullUrl, img });
          }
        }
      });

      console.log(`[파싱 결과] 총 ${campaigns.length}개 라이브 공고 추출 성공!`);
      campaigns.slice(0, 3).forEach((c, idx) => {
        console.log(` ${idx + 1}. 제목: ${c.title}`);
        console.log(`    링크: ${c.href}`);
        console.log(`    이미지: ${c.img || '기본 썸네일'}`);
      });
    } catch (e: any) {
      console.error(`❌ 에러: ${e.message}`);
    }
  }
}

testDomains();
