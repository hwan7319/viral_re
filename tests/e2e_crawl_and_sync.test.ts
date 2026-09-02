import assert from 'assert';
import { runCrawlerCore } from '../src/lib/crawler-core';
import { insertOrUpdateCampaigns, queryCampaigns, getDB } from '../src/lib/db';
import { crawlKeywordOnDemand } from '../src/lib/crawler-core';
import { detectPlatform } from '../src/lib/crawler-parallel';

async function runCrawlAndSyncTests() {
  console.log('================================================================================');
  console.log('🧪 STARTING END-TO-END CRAWLING & AUTO-SYNC PRECISION QA SUITE');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function logPass(testName: string, detail?: string) {
    passed++;
    console.log(`✅ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
  }

  function logFail(testName: string, error: any) {
    failed++;
    console.error(`❌ [FAIL] ${testName}:`, error.message || error);
  }

  // ============================================================================
  // SECTION 1: Crawling Engine & Parser Precision Testing
  // ============================================================================
  console.log('--------------------------------------------------------------------------------');
  console.log('🚀 Section 1: Crawling Engine & Multi-Site Scraper Verification');
  console.log('--------------------------------------------------------------------------------');

  // 1.1 Live / Mock Crawler Execution
  try {
    const startTime = Date.now();
    const result = await runCrawlerCore();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    assert(result !== undefined, 'Crawler result must be defined');
    assert(typeof result.inserted === 'number', 'inserted count must be number');
    assert(typeof result.updated === 'number', 'updated count must be number');
    assert(typeof result.isMock === 'boolean', 'isMock must be boolean');

    logPass('Core Crawler Execution', `Duration: ${duration}s, Inserted: ${result.inserted}, Updated: ${result.updated}, Source: ${result.isMock ? 'Mock Fallback' : 'Live Crawling'}`);
  } catch (e: any) {
    logFail('Core Crawler Execution', e);
  }

  // 1.2 On-Demand Keyword Crawling Test
  try {
    const testKeyword = '삼겹살';
    const startTime = Date.now();
    const count = await crawlKeywordOnDemand(testKeyword);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    assert(typeof count === 'number', 'On-demand crawl result count must be number');
    assert(count >= 0, 'On-demand count must be non-negative');

    logPass(`On-Demand Crawl for "${testKeyword}"`, `Collected: ${count} campaigns, Duration: ${duration}s`);
  } catch (e: any) {
    logFail('On-Demand Crawl Execution', e);
  }

  // 1.3 Platform Detection Parser Verification
  try {
    const platformTests = [
      { title: '[서울 강남][릴스] 삼겹살 맛집', expected: 'instagram' },
      { title: '[부산 해운대][인스타] 카페 체험단', expected: 'instagram' },
      { title: '[경기 수원][유튜브] 리뷰 영상', expected: 'youtube' },
      { title: '[인천][쇼츠] 핫플 추천', expected: 'youtube' },
      { title: '[서울 종로][블로그] 한식당', expected: 'blog' },
      { title: '[서울 마포][클립] 맛집 추천', expected: 'clip' },
      { title: '[서울][블로그+클립] 패키지', expected: 'blog+clip' }
    ];

    let platformMatchCount = 0;
    for (const test of platformTests) {
      const detected = detectPlatform(test.title);
      assert.strictEqual(detected, test.expected, `Title "${test.title}" should be detected as ${test.expected}, got ${detected}`);
      platformMatchCount++;
    }

    logPass('Platform Detection Parser Precision', `${platformMatchCount}/${platformTests.length} badges accurately classified (100% Match)`);
  } catch (e: any) {
    logFail('Platform Detection Parser Precision', e);
  }

  // ============================================================================
  // SECTION 2: Auto-Sync & Dual Query Storage Integrity Testing
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('🚀 Section 2: Auto-Sync & Dual Engine Data Parity Verification');
  console.log('--------------------------------------------------------------------------------');

  const testId = `test-qa-sync-${Date.now()}`;
  const mockCampaign = {
    id: testId,
    title: 'QA Auto-Sync Verification Test Campaign',
    description: 'Automated test campaign payload for sync pipeline verification',
    platform: 'blog',
    category: 'food-korean',
    location: '서울 강남구',
    campaignUrl: 'https://example.com/qa-test-campaign',
    imageUrl: 'https://example.com/qa-test.jpg',
    targetSite: '테스트사이트',
    limitCount: 10,
    applyCount: 3,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    searchKeywords: ',삼겹살,강남,'
  };

  // 2.1 Insertion Sync Test (SQLite + In-Memory Snapshot)
  try {
    const syncResult = await insertOrUpdateCampaigns([mockCampaign]);
    assert.strictEqual(syncResult.inserted, 1, 'Sync should register 1 inserted item');

    // Query back from DB
    const db = await getDB();
    const dbRow = await db.get('SELECT * FROM campaigns WHERE id = ?', testId);
    assert(dbRow !== undefined, 'Campaign must exist in SQLite DB');
    assert.strictEqual(dbRow.title, mockCampaign.title, 'DB title must match sync payload');

    // Query back from queryEngine (In-Memory / Parity)
    const engineResults = await queryCampaigns({ search: 'Verification Test Campaign' });
    const memoryMatch = engineResults.find(c => c.id === testId);
    assert(memoryMatch !== undefined, 'Campaign must exist in Serverless In-Memory snapshot');
    assert.strictEqual(memoryMatch.title, mockCampaign.title, 'Snapshot title must match sync payload');

    logPass('New Record Dual-Storage Sync', 'Successfully inserted into SQLite DB AND In-Memory Snapshot simultaneously');
  } catch (e: any) {
    logFail('New Record Dual-Storage Sync', e);
  }

  // 2.2 Update Sync Test (Modify existing campaign without duplicate)
  try {
    const updatedCampaign = {
      ...mockCampaign,
      applyCount: 15, // Updated apply count
      title: 'QA Auto-Sync Verification Test Campaign [UPDATED]'
    };

    const updateResult = await insertOrUpdateCampaigns([updatedCampaign]);
    assert.strictEqual(updateResult.updated, 1, 'Sync should register 1 updated item');
    assert.strictEqual(updateResult.inserted, 0, 'Sync should NOT insert a duplicate item');

    // Verify updated values in DB
    const db = await getDB();
    const dbRow = await db.get('SELECT * FROM campaigns WHERE id = ?', testId);
    assert.strictEqual(dbRow.apply_count || dbRow.applyCount, 15, 'DB applyCount must update to 15');
    assert.strictEqual(dbRow.title, updatedCampaign.title, 'DB title must update to new title');

    // Verify updated values in memory snapshot
    const engineResults = await queryCampaigns({ search: 'UPDATED' });
    const memoryMatch = engineResults.find(c => c.id === testId);
    assert(memoryMatch !== undefined, 'Updated campaign must be found in memory snapshot');
    assert.strictEqual(memoryMatch.applyCount, 15, 'Memory applyCount must update to 15');

    logPass('Existing Record Update Sync', 'Successfully updated fields without record duplication across both storage engines');
  } catch (e: any) {
    logFail('Existing Record Update Sync', e);
  }

  // 2.3 Cleanup QA Test Data
  try {
    const db = await getDB();
    await db.run('DELETE FROM campaigns WHERE id = ?', testId);
    
    // 글로벌 메모리 버퍼 및 JSON 스냅샷에서도 테스트 레코드 완전 제거
    const globalRef = global as any;
    if (globalRef.memoryCampaigns) {
      globalRef.memoryCampaigns = globalRef.memoryCampaigns.filter((c: any) => c.id !== testId);
    }
    const cleanRows = await db.all('SELECT * FROM campaigns');
    const jsonPath = require('path').join(process.cwd(), 'data', 'campaigns.json');
    require('fs').writeFileSync(jsonPath, JSON.stringify(cleanRows, null, 2));

    logPass('QA Cleanup', `Removed temporary test record ${testId} from DB & JSON snapshot`);
  } catch (e: any) {
    logFail('QA Cleanup', e);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('                    CRAWL & SYNC QA SUMMARY RESULTS                             ');
  console.log('================================================================================');
  console.log(` Total Executed Tests: ${passed + failed}`);
  console.log(` Passed Tests        : ${passed} ✅`);
  console.log(` Failed Tests        : ${failed} ❌`);
  console.log(` Overall Pass Rate   : ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCrawlAndSyncTests().catch(err => {
  console.error('Fatal error in Crawl & Sync QA suite:', err);
  process.exit(1);
});
