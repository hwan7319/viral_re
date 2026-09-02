import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
};

interface SiteSpec {
  num: number;
  name: string;
  targetSite: string;
  urls: string[];
  docFile: string;
}

const SITES: SiteSpec[] = [
  { num: 8, name: '어블로그 (ABlog)', targetSite: '어블로그', urls: ['https://ablog.kr', 'https://www.ablog.kr'], docFile: '08_ABLOG.md' },
  { num: 9, name: '링블 (Ringble)', targetSite: '링블', urls: ['https://www.ringble.co.kr', 'https://ringble.co.kr'], docFile: '09_RINGBLE.md' },
  { num: 10, name: '놀러와체험단', targetSite: '놀러와체험단', urls: ['https://www.cometoplay.kr', 'https://cometoplay.kr'], docFile: '10_NOLLERWA.md' },
  { num: 11, name: '오마이블로그', targetSite: '오마이블로그', urls: ['https://myblog.co.kr', 'https://www.myblog.co.kr', 'https://ohmyblog.co.kr'], docFile: '11_OHMYBLOG.md' },
  { num: 12, name: '에코블로그', targetSite: '에코블로그', urls: ['https://echoblog.co.kr', 'https://www.echoblog.co.kr'], docFile: '12_ECOBLOG.md' },
  { num: 13, name: '리뷰플레이스', targetSite: '리뷰플레이스', urls: ['https://www.reviewplace.co.kr', 'https://reviewplace.co.kr'], docFile: '13_REVIEWPLACE.md' },
  { num: 14, name: '모블 (Mobl)', targetSite: '모블', urls: ['https://mobl.kr', 'https://www.mobl.kr'], docFile: '14_MOBL.md' },
  { num: 15, name: '원더블로그', targetSite: '원더블로그', urls: ['https://wonderblog.co.kr', 'https://www.wonderblog.co.kr'], docFile: '15_WONDERBLOG.md' },
  { num: 16, name: '체험단천국', targetSite: '체험단천국', urls: ['https://www.ch-heaven.co.kr', 'https://ch-heaven.co.kr', 'https://ch-heaven.com'], docFile: '16_CHEONGUK.md' },
  { num: 17, name: '체험단모아', targetSite: '체험단모아', urls: ['https://www.ch-moa.com', 'https://ch-moa.com', 'https://chmoa.co.kr'], docFile: '17_MOA.md' }
];

async function auditSite(site: SiteSpec) {
  console.log(`\n===================================================`);
  console.log(`🔎 [사이트 #${site.num}] ${site.name} 라이브 크롤링 및 파서 점검`);
  console.log(`===================================================`);

  let activeUrl = '';
  let html = '';
  let status = 0;

  for (const u of site.urls) {
    try {
      console.log(`Trying ${u}...`);
      const res = await axios.get(u, { headers: HEADERS, timeout: 7000 });
      if (res.status === 200 && res.data.length > 500) {
        activeUrl = u;
        html = res.data;
        status = res.status;
        console.log(`✅ Connection Success: ${u} (HTTP 200 OK)`);
        break;
      }
    } catch (e: any) {
      console.log(`❌ Failed ${u}: ${e.message}`);
    }
  }

  if (!activeUrl) {
    console.error(`⚠️ ${site.name} all URLs failed.`);
    return { site, success: false, error: 'Connection Failed' };
  }

  const $ = cheerio.load(html);
  const siteTitle = $('title').text().trim().replace(/\s+/g, ' ');
  console.log(`[Site Title] ${siteTitle}`);

  const campaigns: any[] = [];
  const now = new Date();

  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const parent = $(el).closest('div, li, article');
    
    let rawTitle = $(el).find('h3, h4, strong, .title, [class*="title"], [class*="tit"]').first().text().trim() ||
                   parent.find('h3, h4, strong, .title, [class*="title"], [class*="tit"]').first().text().trim() ||
                   $(el).text().trim() ||
                   parent.text().trim();
    rawTitle = rawTitle.replace(/\s+/g, ' ');

    let img = $(el).find('img').attr('data-original') ||
              $(el).find('img').attr('data-src') ||
              $(el).find('img').attr('src') ||
              parent.find('img').attr('data-original') ||
              parent.find('img').attr('data-src') ||
              parent.find('img').attr('src') || '';

    if (img && img.startsWith('//')) img = 'https:' + img;
    if (img && !img.startsWith('http')) {
      img = `${activeUrl}${img.startsWith('/') ? '' : '/'}${img}`;
    }

    if (href.includes('detail') || href.includes('campaign') || href.includes('item') || href.includes('view') || href.includes('cp') || href.includes('/b/')) {
      if (rawTitle && rawTitle.length > 3 && !rawTitle.startsWith('http') && !rawTitle.includes('로그인') && !rawTitle.includes('회원가입')) {
        const fullUrl = href.startsWith('http') ? href : `${activeUrl}${href.startsWith('/') ? '' : '/'}${href}`;
        const cpIdMatch = href.match(/(\d+)/);
        const cpId = cpIdMatch ? cpIdMatch[1] : `${i}`;

        if (!campaigns.some(c => c.title === rawTitle || c.href === fullUrl)) {
          campaigns.push({
            id: `${site.targetSite.toLowerCase()}-${cpId}`,
            title: rawTitle.slice(0, 60),
            description: rawTitle,
            platform: 'blog',
            category: 'general',
            campaignUrl: fullUrl,
            imageUrl: img || 'https://picsum.photos/600/400',
            targetSite: site.targetSite,
            limitCount: 5,
            applyCount: 0,
            startDate: now.toISOString().split('T')[0],
            endDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          });
        }
      }
    }
  });

  console.log(`[파싱 결과] 총 ${campaigns.length}개 라이브 공고 추출 성공!`);
  if (campaigns.length > 0) {
    console.log('Sample Campaigns:');
    campaigns.slice(0, 3).forEach((c, idx) => {
      console.log(` ${idx + 1}. ${c.title} | Link: ${c.campaignUrl} | Img: ${c.imageUrl}`);
    });
  }

  return {
    site,
    success: true,
    activeUrl,
    siteTitle,
    count: campaigns.length,
    campaigns
  };
}

async function runBatchAudit() {
  console.log('🚀 8번 ~ 17번 사이트 일괄 라이브 점검 시작...');
  const results: any[] = [];
  const allCollectedCampaigns: any[] = [];

  for (const s of SITES) {
    const res = await auditSite(s);
    results.push(res);
    if (res.success && res.campaigns) {
      allCollectedCampaigns.push(...res.campaigns);
    }
  }

  console.log('\n===================================================');
  console.log('📊 [8번 ~ 17번 라이브 점검 최종 요약]');
  console.log('===================================================');
  results.forEach(r => {
    if (r.success) {
      console.log(`✅ [사이트 #${r.site.num}] ${r.site.name} (${r.activeUrl}) -> ${r.count}건 추출 성공`);
    } else {
      console.log(`❌ [사이트 #${r.site.num}] ${r.site.name} -> 접속/파싱 실패`);
    }
  });

  // Save audit log to scratch
  const logDir = path.join(__dirname, '../../scratch');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'batch_audit_results.json'), JSON.stringify(results, null, 2));

  return { results, allCollectedCampaigns };
}

runBatchAudit();
