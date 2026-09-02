import axios from 'axios';
import * as cheerio from 'cheerio';

async function pushCloudReview() {
  console.log('Fetching live CloudReview campaigns...');
  const res = await axios.get('https://cloudreview.co.kr', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });
  const $ = cheerio.load(res.data);
  const collected: any[] = [];
  const now = new Date();

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

    if (rawTitle && rawTitle.length > 3 && cpId && !collected.some(c => c.id === `cr-${cpId}`)) {
      collected.push({
        id: `cr-${cpId}`,
        title: rawTitle,
        description: rawTitle,
        platform: 'blog',
        category: 'life',
        campaignUrl: `https://cloudreview.co.kr/campaign/detail/${cpId}`,
        imageUrl: img || 'https://picsum.photos/600/400',
        targetSite: '클라우드리뷰',
        limitCount: 10,
        applyCount: 0,
        startDate: now.toISOString().split('T')[0],
        endDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });
    }
  });

  console.log(`Prepared ${collected.length} CloudReview items to push...`);

  const endpoints = [
    'http://54.180.169.99/api/sync',
    'https://viral-re.vercel.app/api/sync'
  ];

  for (const ep of endpoints) {
    try {
      const syncRes = await axios.post(ep, { campaigns: collected }, { timeout: 10000 });
      console.log(`Synced to ${ep}:`, syncRes.data);
    } catch (e: any) {
      console.log(`Sync failed to ${ep}:`, e.message);
    }
  }
}

pushCloudReview();
