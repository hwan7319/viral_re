import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
};

async function testMibleSearch() {
  const keyword = '미와담';
  const urls = [
    `https://www.mrblog.net/campaigns?keyword=${encodeURIComponent(keyword)}`,
    `https://www.mrblog.net/campaigns?search=${encodeURIComponent(keyword)}`,
    `https://www.mrblog.net/campaigns?q=${encodeURIComponent(keyword)}`,
    `https://www.mrblog.net/search?q=${encodeURIComponent(keyword)}`,
    `https://www.mrblog.net`
  ];

  for (const url of urls) {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 6000 });
      const $ = cheerio.load(res.data);
      const matches: any[] = [];
      $('a').each((i, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        const href = $(el).attr('href') || '';
        const img = $(el).find('img').attr('src') || $(el).parent().find('img').attr('src') || '';
        if (text.includes(keyword)) {
          matches.push({ title: text, href, img });
        }
      });
      console.log(`URL: ${url} -> Found ${matches.length} matches for '${keyword}':`);
      matches.forEach(m => console.log('  -', m.title, m.href, m.img));
    } catch (e: any) {
      console.log(`URL: ${url} -> Error: ${e.message}`);
    }
  }
}

testMibleSearch();
