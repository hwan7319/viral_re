import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { queryCampaigns } from '../lib/db';

async function compare() {
  console.log('============================================');
  console.log('=== MULTI-PLATFORM DATA RECONCILIATION ===');
  console.log('============================================\n');

  const rawOriginals: { id: string; title: string; source: string }[] = [];

  // 1. 강남맛집 원본 파싱 (Static + AJAX)
  const gnStaticPath = path.join(process.cwd(), 'data/gangnam_chicken.html');
  const gnAjaxPath = path.join(process.cwd(), 'data/gangnam_ajax_chicken_p1.html');

  if (fs.existsSync(gnStaticPath)) {
    const $ = cheerio.load(fs.readFileSync(gnStaticPath, 'utf-8'));
    $('.list_item').each((i, el) => {
      const titleLink = $(el).find('dt.tit a');
      const title = titleLink.text().trim();
      const href = titleLink.attr('href') || '';
      const match = href.match(/id=(\d+)/);
      const id = `gn-${match ? match[1] : href.replace(/[^0-9]/g, '')}`;
      if (title) rawOriginals.push({ id, title, source: '강남맛집' });
    });
  }
  if (fs.existsSync(gnAjaxPath)) {
    const $ = cheerio.load(`<ul>${fs.readFileSync(gnAjaxPath, 'utf-8')}</ul>`);
    $('li.list_item').each((i, el) => {
      const titleLink = $(el).find('dt.tit a');
      const title = titleLink.text().trim();
      const href = titleLink.attr('href') || '';
      const match = href.match(/id=(\d+)/);
      const id = `gn-${match ? match[1] : href.replace(/[^0-9]/g, '')}`;
      if (title) rawOriginals.push({ id, title, source: '강남맛집' });
    });
  }

  // 2. 디너의여왕 원본 파싱
  const dqPath = path.join(process.cwd(), 'data/dq_search_query_all.html');
  if (fs.existsSync(dqPath)) {
    const $ = cheerio.load(fs.readFileSync(dqPath, 'utf-8'));
    $('.qz-dq-card').each((i, el) => {
      const linkEl = $(el).find('.qz-dq-card__link');
      const rawTitle = linkEl.attr('title') || '';
      const title = rawTitle.replace(/신청하기$/, '').replace(/보러가기$/, '').trim();
      const href = linkEl.attr('href') || '';
      const id = `dq-${href.split('/').pop() || href.replace(/[^0-9]/g, '')}`;
      if (title) rawOriginals.push({ id, title, source: '디너의여왕' });
    });
  }

  // 3. 포블로그 원본 파싱
  const pbPath = path.join(process.cwd(), 'data/4blog_chicken.json');
  if (fs.existsSync(pbPath)) {
    const data = JSON.parse(fs.readFileSync(pbPath, 'utf-8'));
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        const id = `pb-${item.CID}`;
        const title = (item.LOCATION_NM || '') + ' ' + (item.CAMPAIGN_NM || '');
        rawOriginals.push({ id, title, source: '포블로그' });
      });
    }
  }

  // 4. 리뷰노트 원본 파싱
  const rnPath = path.join(process.cwd(), 'data/reviewnote_chicken.json');
  if (fs.existsSync(rnPath)) {
    const resData = JSON.parse(fs.readFileSync(rnPath, 'utf-8'));
    const campaignsList = resData?.objects;
    if (Array.isArray(campaignsList)) {
      campaignsList.forEach((item: any) => {
        const id = `rn-${item.id}`;
        const title = item.title;
        rawOriginals.push({ id, title, source: '리뷰노트' });
      });
    }
  }

  // 플랫폼별 원본 수집 통계 출력
  console.log('[SOURCE PLATFORM STATISTICS (Raw Scraped)]');
  const sources = ['강남맛집', '디너의여왕', '포블로그', '리뷰노트'];
  sources.forEach(src => {
    const total = rawOriginals.filter(o => o.source === src).length;
    const uniqueIds = new Set(rawOriginals.filter(o => o.source === src).map(o => o.id));
    console.log(`- ${src}: Gross ${total} items | Unique ${uniqueIds.size} items`);
  });

  const uniqueOriginalsMap = new Map<string, { title: string; source: string }>();
  rawOriginals.forEach(o => {
    uniqueOriginalsMap.set(o.id, { title: o.title, source: o.source });
  });
  console.log(`\n- Gross Total Unique Source Campaigns: ${uniqueOriginalsMap.size} items`);

  // 5. 우리 DB에서 치킨 검색 결과 가져오기
  const dbCampaigns = await queryCampaigns({ search: '치킨' });
  console.log(`\n[TARGET: Our Local Database (review-moa.db) Results]`);
  console.log(`- Total Search Results: ${dbCampaigns.length} items`);
  sources.forEach(src => {
    const count = dbCampaigns.filter(c => c.targetSite === src).length;
    console.log(`  * ${src} Campaigns: ${count} items`);
  });

  // 6. 1대1 매칭 교차 체크
  console.log('\n============================================');
  console.log('=== DETAILED PLATFORM RECONCILIATION ===');
  console.log('============================================');
  
  const missingMap = new Map<string, string[]>();
  sources.forEach(s => missingMap.set(s, []));

  uniqueOriginalsMap.forEach((meta, id) => {
    const found = dbCampaigns.find(c => c.id === id);
    if (!found) {
      missingMap.get(meta.source)?.push(`[Missing] ID: ${id} | Title: ${meta.title}`);
    }
  });

  let hasMismatch = false;
  sources.forEach(src => {
    const missingList = missingMap.get(src) || [];
    if (missingList.length === 0) {
      console.log(`✅ ${src}: 100% PERFECT MATCH! All unique source campaigns are successfully matched in DB.`);
    } else {
      hasMismatch = true;
      console.log(`❌ ${src}: MISMATCH DETECTED! ${missingList.length} items are missing in DB:`);
      missingList.forEach(item => console.log(`   ${item}`));
    }
  });

  console.log('\n============================================');
  if (!hasMismatch) {
    console.log('🎉 SYSTEM INTEGRITY VERIFIED: 100% ZERO-LOSS AGGREGATION CONFIRMED!');
  } else {
    console.log('⚠️ SYSTEM WARNING: Some campaigns are not properly reconciled.');
  }
  console.log('============================================');

  process.exit(0);
}

compare().catch(console.error);
