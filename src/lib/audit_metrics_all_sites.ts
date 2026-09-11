import fs from 'fs';

async function auditSiteMetrics() {
  console.log('===============================================================');
  console.log('🔍 [17대 체험단 사이트 수집 데이터 정밀도 전수 진단]');
  console.log('===============================================================\n');

  const snapshot = JSON.parse(fs.readFileSync('data/campaigns.json', 'utf8'));

  const sites = Array.from(new Set(snapshot.map((c: any) => c.targetSite || '기타')));
  
  const siteAnalysis = sites.map((site: string) => {
    const campaigns = snapshot.filter((c: any) => (c.targetSite || '기타') === site);
    const total = campaigns.length;

    let zeroApply = 0;
    let defaultLimit5or10 = 0;
    let validApplyCount = 0;

    const endDatesSet = new Set<string>();
    const createdAtsSet = new Set<string>();

    campaigns.forEach((c: any) => {
      if (c.applyCount === 0) zeroApply++;
      else validApplyCount++;

      if (c.limitCount === 5 || c.limitCount === 10) defaultLimit5or10++;

      if (c.endDate) endDatesSet.add(c.endDate);
      if (c.createdAt) createdAtsSet.add(c.createdAt.split('T')[0]);
    });

    const isEndDateHardcoded = endDatesSet.size <= 2;
    const isApplyCountMissing = (zeroApply / total) > 0.9;
    const isLimitCountDefaulted = (defaultLimit5or10 / total) > 0.9;

    return {
      사이트: site,
      전체건수: total,
      지원수0건비율: `${((zeroApply / total) * 100).toFixed(1)}%`,
      모집수기본값비율: `${((defaultLimit5or10 / total) * 100).toFixed(1)}%`,
      마감일종류수: endDatesSet.size,
      수집일종류수: createdAtsSet.size,
      마감임박정밀도: isEndDateHardcoded ? '❌ 고정/단일화' : '✅ 파싱됨',
      경쟁률정밀도: (isApplyCountMissing || isLimitCountDefaulted) ? '❌ 누락/기본값' : '✅ 파싱됨',
    };
  });

  console.table(siteAnalysis);
}

auditSiteMetrics();
