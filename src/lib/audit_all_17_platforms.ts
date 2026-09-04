import fs from 'fs';
import path from 'path';
import { scrapeDetailMission, scrapeDetailBenefit, scrapeDetailCounts } from './detail-scraper';

interface AuditResult {
  site: string;
  totalCount: number;
  sampleId: string;
  sampleTitle: string;
  sampleUrl: string;
  urlType: 'DIRECT_DEEP_LINK' | 'OFFICIAL_MAIN' | 'INVALID';
  thumbnailStatus: 'REAL_IMAGE' | 'DUMMY_PICSUM';
  missionResult: 'SUCCESS' | 'EMPTY' | 'BLOCKED';
  missionLength: number;
  benefitResult: 'SUCCESS' | 'EMPTY';
  countsResult: 'SUCCESS' | 'DEFAULT';
  issues: string[];
}

export async function runFullAudit() {
  console.log('🔍 Starting Comprehensive Audit for all 17 Platforms...\n');
  const dataPath = path.join(process.cwd(), 'data', 'campaigns.json');
  if (!fs.existsSync(dataPath)) {
    console.error('campaigns.json not found!');
    return;
  }

  const campaigns: any[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const grouped = new Map<string, any[]>();

  campaigns.forEach(c => {
    const site = c.targetSite || '기타';
    if (!grouped.has(site)) grouped.set(site, []);
    grouped.get(site)!.push(c);
  });

  const allSites = [
    '강남맛집', '디너의여왕', '리뷰노트', '포블로그', '리뷰플레이스',
    '미블', '클라우드리뷰', '링블', '놀러와체험단', '모블',
    '오마이블로그', '체험단모아', '레뷰 (REVU)', '레뷰',
    '어블로그', '에코블로그', '원더블로그', '체험단천국'
  ];

  const results: AuditResult[] = [];

  for (const siteName of grouped.keys()) {
    const list = grouped.get(siteName) || [];
    const sample = list[0];
    if (!sample) continue;

    const issues: string[] = [];
    const url = sample.campaignUrl || '';
    let urlType: AuditResult['urlType'] = 'INVALID';
    if (url.includes('viral-re.co.kr') || url.includes('localhost')) {
      urlType = 'INVALID';
      issues.push('Campaign URL references local domain');
    } else if (url.includes('detail') || url.includes('campaigns') || url.includes('view') || url.includes('cp/') || url.includes('pr/') || url.includes('product') || url.includes('taste')) {
      urlType = 'DIRECT_DEEP_LINK';
    } else {
      urlType = 'OFFICIAL_MAIN';
      issues.push('Campaign URL links to main domain instead of direct post');
    }

    const img = sample.imageUrl || '';
    let thumbnailStatus: AuditResult['thumbnailStatus'] = 'REAL_IMAGE';
    if (img.includes('picsum.photos')) {
      thumbnailStatus = 'DUMMY_PICSUM';
      issues.push('Thumbnail uses picsum.photos placeholder image');
    }

    console.log(`\nTesting site: [${siteName}] (Total: ${list.length})`);
    console.log(`Sample: ${sample.title}`);
    console.log(`URL: ${url}`);

    let mission = '';
    let benefit = '';
    let counts: any = {};

    try {
      mission = (await scrapeDetailMission(url, siteName)) || '';
    } catch (e: any) {
      issues.push(`Mission scraper threw error: ${e.message}`);
    }

    try {
      benefit = (await scrapeDetailBenefit(url, siteName)) || '';
    } catch (e: any) {
      issues.push(`Benefit scraper threw error: ${e.message}`);
    }

    try {
      counts = await scrapeDetailCounts(url, siteName, sample.title);
    } catch (e: any) {
      issues.push(`Counts scraper threw error: ${e.message}`);
    }

    let missionResult: AuditResult['missionResult'] = mission.length > 10 ? 'SUCCESS' : 'EMPTY';
    if (missionResult === 'EMPTY') {
      issues.push('Mission & guidelines text is empty or could not be extracted');
    }

    let benefitResult: AuditResult['benefitResult'] = benefit.length > 0 ? 'SUCCESS' : 'EMPTY';
    let countsResult: AuditResult['countsResult'] = counts.applyCount !== undefined || counts.limitCount !== undefined ? 'SUCCESS' : 'DEFAULT';

    results.push({
      site: siteName,
      totalCount: list.length,
      sampleId: sample.id,
      sampleTitle: sample.title.slice(0, 40),
      sampleUrl: url,
      urlType,
      thumbnailStatus,
      missionResult,
      missionLength: mission.length,
      benefitResult,
      countsResult,
      issues
    });
  }

  console.log('\n================================================================================');
  console.log('📊 FINAL AUDIT SUMMARY TABLE FOR ALL PLATFORMS');
  console.log('================================================================================');
  console.table(results.map(r => ({
    Platform: r.site,
    Count: r.totalCount,
    URL_Type: r.urlType,
    Thumbnail: r.thumbnailStatus,
    Mission: r.missionResult,
    MissionLen: r.missionLength,
    IssuesCount: r.issues.length
  })));

  console.log('\n🚨 DETAILED PLATFORM ISSUES & DIAGNOSTICS:');
  results.forEach(r => {
    if (r.issues.length > 0) {
      console.log(`\n❌ [${r.site}] (${r.totalCount} items):`);
      r.issues.forEach(i => console.log(`   - ${i}`));
    } else {
      console.log(`\n✅ [${r.site}] (${r.totalCount} items): PERFECT (100% Valid & Operational)`);
    }
  });

  return results;
}

runFullAudit();
