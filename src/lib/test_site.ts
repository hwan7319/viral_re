import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFullMibleScrape() {
  try {
    const client = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 6000
    });

    const initRes = await client.get('https://www.mrblog.net');
    const cookies = initRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';

    const subPages = [
      'https://www.mrblog.net',
      'https://www.mrblog.net/campaigns/region',
      'https://www.mrblog.net/campaigns/delivery',
      'https://www.mrblog.net/campaigns?sort=마감순'
    ];

    const allTitles: string[] = [];

    for (const pageUrl of subPages) {
      const pageRes = await client.get(pageUrl, {
        headers: {
          'Cookie': cookies,
          'Referer': 'https://www.mrblog.net/'
        }
      });
      const $ = cheerio.load(pageRes.data);
      $('a').each((i, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        const href = $(el).attr('href') || '';
        if (href.includes('/campaigns/') && text.length > 5 && !allTitles.includes(text)) {
          allTitles.push(text);
        }
      });
    }

    console.log(`Successfully scraped TOTAL ${allTitles.length} unique Mible campaigns!`);
    console.log('Sample titles:', allTitles.slice(0, 10));
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

testFullMibleScrape();
