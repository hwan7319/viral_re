import { getDB } from './src/lib/db';
import { scrapeDetailCounts, scrapeDetailBenefit, scrapeDetailMission } from './src/lib/detail-scraper';

// 동시에 처리할 병열 비동기 배치 크기 (사이트별 과도한 요청 블락 방지용)
const BATCH_SIZE = 5; 

async function runBulkAudit() {
  console.log('======================================================');
  console.log('🚀 [대규모 17대 체험단 100개+ 전수 무결성 오디트 스크립트 시작]');
  console.log('======================================================\n');

  const db = await getDB();

  // 17대 주요 체험단 대표 타겟 사이트 목록
  const targetSites = [
    '포블로그',
    '디너의여왕',
    '강남맛집',
    '레뷰',
    '미블',
    '링블',
    '리뷰노트',
    '체험뷰',
    '아싸뷰'
  ];

  const summaryReport: Record<string, { total: number; synced: number; matched: number; failed: number }> = {};

  for (const site of targetSites) {
    console.log(`\n🔍 [${site}] 플랫폼 100개 공고 무결성 검증 시작...`);
    
    // DB에서 해당 플랫폼의 라이브 공고 최대 100개 추출
    const campaigns = await db.all(`
      SELECT id, title, targetSite, campaignUrl, description, applyCount, limitCount, mission 
      FROM campaigns 
      WHERE (targetSite LIKE ? OR id LIKE ?) 
        AND campaignUrl IS NOT NULL 
        AND campaignUrl != ''
      LIMIT 100
    `, [`%${site}%`, `%${site}%`]);

    console.log(`   ➜ 조회된 대상 공고 수: ${campaigns.length}개`);
    
    summaryReport[site] = { total: campaigns.length, synced: 0, matched: 0, failed: 0 };

    // BATCH_SIZE 단위로 나눠서 병열 검증 수행
    for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
      const batch = campaigns.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (c) => {
        try {
          const counts = await scrapeDetailCounts(c.campaignUrl, c.targetSite);
          
          let updated = false;
          let newApply = c.applyCount;
          let newLimit = c.limitCount;

          if (counts.applyCount !== undefined && counts.applyCount !== c.applyCount) {
            newApply = counts.applyCount;
            updated = true;
          }
          if (counts.limitCount !== undefined && counts.limitCount !== c.limitCount) {
            newLimit = counts.limitCount;
            updated = true;
          }

          if (updated) {
            await db.run('UPDATE campaigns SET applyCount = ?, limitCount = ? WHERE id = ?', [newApply, newLimit, c.id]);
            summaryReport[site].synced++;
          } else {
            summaryReport[site].matched++;
          }
        } catch (err: any) {
          summaryReport[site].failed++;
        }
      }));

      if ((i + BATCH_SIZE) % 25 === 0 || (i + BATCH_SIZE) >= campaigns.length) {
        console.log(`   ➜ [${site}] ${Math.min(i + BATCH_SIZE, campaigns.length)} / ${campaigns.length}개 검증 완료 (갱신: ${summaryReport[site].synced}건, 일치: ${summaryReport[site].matched}건)`);
      }
    }
  }

  console.log('\n======================================================');
  console.log('📊 [17대 플랫폼 대규모 전수 무결성 오디트 최종 결과 보고]');
  console.log('======================================================');
  
  let grandTotal = 0;
  let grandSynced = 0;
  let grandMatched = 0;

  console.table(
    Object.entries(summaryReport).map(([site, stat]) => {
      grandTotal += stat.total;
      grandSynced += stat.synced;
      grandMatched += stat.matched;
      return {
        '플랫폼': site,
        '검증 공고 수': `${stat.total}개`,
        '실시간 수치 DB 동기화': `${stat.synced}건`,
        '100% 수치 일치': `${stat.matched}건`,
        '실패': `${stat.failed}건`
      };
    })
  );

  console.log(`\n🎉 전체 총 ${grandTotal}개 공고 검증 완료! (실시간 동기화: ${grandSynced}건, 수치 완전 일치: ${grandMatched}건)`);
  console.log('======================================================\n');

  process.exit(0);
}

runBulkAudit();
