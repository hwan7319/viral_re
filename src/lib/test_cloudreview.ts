import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function testCleanCloudReviewTitles() {
  const res = await axios.get('https://cloudreview.co.kr', { headers: HEADERS, timeout: 6000 });
  const $ = cheerio.load(res.data);

  const collected: any[] = [];

  $('a[href*="/campaign/detail/"]').each((i, el) => {
    const href = $(el).attr('href') || '';
    const parent = $(el).closest('div.relative, article, div.campaign-image').parent();
    
    let rawTitle = parent.find('div.text-sm.px-3.pt-3 a').text().trim() || 
                   parent.find('div.truncate.pl-1').text().trim() || 
                   $(el).text().trim();
    rawTitle = rawTitle.replace(/\s+/g, ' ');

    const img = parent.find('img').attr('data-original') || parent.find('img').attr('data-src') || parent.find('img').attr('src') || '';
    const cpIdMatch = href.match(/\/detail\/(\d+)/);
    const cpId = cpIdMatch ? cpIdMatch[1] : '';

    if (rawTitle && rawTitle.length > 3 && cpId && !collected.some(c => c.id === cpId)) {
      collected.push({ id: cpId, title: rawTitle, img });
    }
  });

  console.log(`Cleanly parsed ${collected.length} unique CloudReview cards:`);
  collected.slice(0, 5).forEach(c => console.log(' -', c.id, '| Title:', c.title));
}

testCleanCloudReviewTitles();
