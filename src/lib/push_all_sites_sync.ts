import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function syncAllRemainingSites() {
  console.log('🚀 8번 ~ 17번 라이브 플랫폼 데이터 일괄 수집 및 동기화 시작...');
  const now = new Date();
  const collected: any[] = [];

  // 1. 링블
  try {
    const res = await axios.get('https://www.ringble.co.kr', { headers: HEADERS, timeout: 6000 });
    const $ = cheerio.load(res.data);
    $('a[href*="detail.php"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const parent = $(el).closest('div, li');
      let rawTitle = $(el).text().trim().replace(/\s+/g, ' ') || parent.text().trim().replace(/\s+/g, ' ');
      let img = $(el).find('img').attr('src') || parent.find('img').attr('src') || '';
      if (img && img.startsWith('//')) img = 'https:' + img;
      if (img && !img.startsWith('http')) img = `https://www.ringble.co.kr${img.startsWith('/') ? '' : '/'}${img}`;
      const numMatch = href.match(/number=(\d+)/);
      const cpId = numMatch ? numMatch[1] : `${i}`;
      if (rawTitle && rawTitle.length > 3 && !collected.some(c => c.id === `ringble-${cpId}`)) {
        collected.push({
          id: `ringble-${cpId}`, title: rawTitle.slice(0, 60), description: rawTitle, platform: 'blog', category: 'general',
          campaignUrl: href.startsWith('http') ? href : `https://www.ringble.co.kr/${href}`,
          imageUrl: img || 'https://picsum.photos/600/400', targetSite: '링블', limitCount: 5, applyCount: 0,
          startDate: now.toISOString().split('T')[0], endDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
          createdAt: now.toISOString(), updatedAt: now.toISOString()
        });
      }
    });
  } catch (e: any) { console.error('Ringble err:', e.message); }

  // 2. 놀러와체험단
  try {
    const res = await axios.get('https://www.cometoplay.kr', { headers: HEADERS, timeout: 6000 });
    const $ = cheerio.load(res.data);
    $('a[href*="item.php"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const parent = $(el).closest('div, li');
      let rawTitle = $(el).text().trim().replace(/\s+/g, ' ') || parent.text().trim().replace(/\s+/g, ' ');
      let img = $(el).find('img').attr('src') || parent.find('img').attr('src') || '';
      if (img && img.startsWith('//')) img = 'https:' + img;
      if (img && !img.startsWith('http')) img = `https://www.cometoplay.kr${img.startsWith('/') ? '' : '/'}${img}`;
      const numMatch = href.match(/it_id=(\d+)/);
      const cpId = numMatch ? numMatch[1] : `${i}`;
      if (rawTitle && rawTitle.length > 3 && !collected.some(c => c.id === `cometoplay-${cpId}`)) {
        collected.push({
          id: `cometoplay-${cpId}`, title: rawTitle.slice(0, 60), description: rawTitle, platform: 'blog', category: 'general',
          campaignUrl: href.startsWith('http') ? href : `https://www.cometoplay.kr/${href}`,
          imageUrl: img || 'https://picsum.photos/600/400', targetSite: '놀러와체험단', limitCount: 5, applyCount: 0,
          startDate: now.toISOString().split('T')[0], endDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
          createdAt: now.toISOString(), updatedAt: now.toISOString()
        });
      }
    });
  } catch (e: any) { console.error('ComeToPlay err:', e.message); }

  // 3. 모블 (모두의블로그)
  try {
    const res = await axios.get('https://www.modublog.co.kr', { headers: HEADERS, timeout: 6000 });
    const $ = cheerio.load(res.data);
    $('a[href*="/product/"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const parent = $(el).closest('div, li');
      let rawTitle = $(el).text().trim().replace(/\s+/g, ' ') || parent.text().trim().replace(/\s+/g, ' ');
      let img = $(el).find('img').attr('src') || parent.find('img').attr('src') || '';
      if (img && img.startsWith('//')) img = 'https:' + img;
      if (img && !img.startsWith('http')) img = `https://www.modublog.co.kr${img.startsWith('/') ? '' : '/'}${img}`;
      const numMatch = href.match(/\/product\/(\d+)/);
      const cpId = numMatch ? numMatch[1] : `${i}`;
      if (rawTitle && rawTitle.length > 3 && !collected.some(c => c.id === `modublog-${cpId}`)) {
        collected.push({
          id: `modublog-${cpId}`, title: rawTitle.slice(0, 60), description: rawTitle, platform: 'blog', category: 'general',
          campaignUrl: href.startsWith('http') ? href : `https://www.modublog.co.kr${href}`,
          imageUrl: img || 'https://picsum.photos/600/400', targetSite: '모블', limitCount: 5, applyCount: 0,
          startDate: now.toISOString().split('T')[0], endDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
          createdAt: now.toISOString(), updatedAt: now.toISOString()
        });
      }
    });
  } catch (e: any) { console.error('ModuBlog err:', e.message); }

  console.log(`Prepared TOTAL ${collected.length} fresh campaigns across remaining sites!`);

  const targetEndpoints = [
    'https://viral-re.co.kr/api/sync',
    'https://viral-re.vercel.app/api/sync'
  ];

  for (const ep of targetEndpoints) {
    try {
      const res = await axios.post(ep, { campaigns: collected }, { timeout: 10000 });
      console.log(`✅ Synced to ${ep}:`, res.data);
    } catch (err: any) {
      console.error(`❌ Sync failed to ${ep}:`, err.message);
    }
  }
}

syncAllRemainingSites();
