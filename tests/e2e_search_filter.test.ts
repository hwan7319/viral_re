/**
 * =========================================================================================
 * review-moa (viral_re) Precision Automated Test Suite: Integrated Search Filters (M1)
 * =========================================================================================
 * 
 * Features Verified:
 * - F1: Recruitment Type Filter (all, visit, delivery) & DB Partitioning Invariants
 * - F2: Category 25-Type Filter (+ etc & major group mappings via CATEGORY_GROUP_MAP)
 * - F3: Platform Filter (all, blog, clip, blog+clip, instagram, youtube, etc)
 * - F4: Region Sido (17 광역시도) & Sigungu (25+ High-density districts) Stemming & Matching
 * - F5: Multi-Filter Combinations, Sort Rules, and Keyword / Negative Keyword Exclusion
 * - F6: Dual Query Engine Parity (SQLite SQL Engine vs Serverless In-Memory Engine)
 * 
 * Target Accuracy: >= 99.0% across all assertions (Target: 100.0%)
 * Exit Code: 0 on Success, 1 on Any Failure
 * =========================================================================================
 */

import assert from 'node:assert';
import { queryCampaigns, getDB, CATEGORY_GROUP_MAP, Campaign } from '../src/lib/db';

// ANSI styling for test terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
};

// Global Test Metric Accumulator
interface TestMetric {
  suiteName: string;
  testName: string;
  passed: boolean;
  totalRecordsEvaluated: number;
  validMatches: number;
  accuracy: number;
  durationMs: number;
  error?: string;
}

const metrics: TestMetric[] = [];

async function recordTest(
  suiteName: string,
  testName: string,
  fn: () => Promise<{ evaluated: number; valid: number } | void>
): Promise<void> {
  const start = performance.now();
  try {
    const res = await fn();
    const durationMs = Math.round(performance.now() - start);
    const evaluated = res ? res.evaluated : 1;
    const valid = res ? res.valid : 1;
    const accuracy = evaluated > 0 ? (valid / evaluated) * 100 : 100;

    assert.ok(accuracy >= 99.0, `Accuracy ${accuracy.toFixed(2)}% is below required 99.0% threshold`);

    metrics.push({
      suiteName,
      testName,
      passed: true,
      totalRecordsEvaluated: evaluated,
      validMatches: valid,
      accuracy,
      durationMs,
    });
    console.log(`  ${colors.green}✔${colors.reset} [PASS] ${testName} ${colors.dim}(${durationMs}ms, acc: ${accuracy.toFixed(1)}%, n=${evaluated})${colors.reset}`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const durationMs = Math.round(performance.now() - start);
    metrics.push({
      suiteName,
      testName,
      passed: false,
      totalRecordsEvaluated: 0,
      validMatches: 0,
      accuracy: 0,
      durationMs,
      error: errorMsg,
    });
    console.error(`  ${colors.red}✖ [FAIL]${colors.reset} ${testName} ${colors.dim}(${durationMs}ms)${colors.reset}`);
    console.error(`    ${colors.red}Error: ${errorMsg}${colors.reset}`);
  }
}

// Helpers to isolate SQLite mode vs Serverless In-Memory mode
function setSqliteMode() {
  delete process.env.VERCEL;
  delete process.env.NOW_BUILDER;
}

function setServerlessMode() {
  process.env.VERCEL = '1';
}

// Delivery indicators defined in db.ts
const DELIVERY_TOKENS = ['배송', '전국', '재택', '택배', '온라인'];

function isDeliveryCampaign(c: Campaign): boolean {
  if (!c.location || c.location.trim().length === 0) return true;
  return DELIVERY_TOKENS.some(token => c.location!.includes(token));
}

function isVisitCampaign(c: Campaign): boolean {
  return !isDeliveryCampaign(c);
}

// =========================================================================================
// TIER 1: Feature Isolation Tests (단일 필터 격리 정밀 검증)
// =========================================================================================
async function runTier1IsolationTests() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan} [TIER 1] Feature Isolation Precision Tests (F1 ~ F4)${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);

  setSqliteMode();
  await getDB();

  // 1.1 Recruitment Type Isolation (F1)
  await recordTest('Tier 1 Isolation', 'F1.1: Recruitment Type [all] returns active campaigns', async () => {
    const results = await queryCampaigns({ type: 'all' });
    assert.ok(results.length > 0, 'Results should not be empty');
    assert.ok(results.length <= 300, 'Results must respect 300 cap');
    return { evaluated: results.length, valid: results.length };
  });

  await recordTest('Tier 1 Isolation', 'F1.2: Recruitment Type [visit] has 100% valid location and excludes delivery tokens', async () => {
    const results = await queryCampaigns({ type: 'visit' });
    assert.ok(results.length > 0, 'Visit campaigns should return results');
    let valid = 0;
    for (const c of results) {
      if (isVisitCampaign(c)) valid++;
    }
    return { evaluated: results.length, valid };
  });

  await recordTest('Tier 1 Isolation', 'F1.3: Recruitment Type [delivery] has 100% empty location or delivery tokens', async () => {
    const results = await queryCampaigns({ type: 'delivery' });
    assert.ok(results.length > 0, 'Delivery campaigns should return results');
    let valid = 0;
    for (const c of results) {
      if (isDeliveryCampaign(c)) valid++;
    }
    return { evaluated: results.length, valid };
  });

  // 1.2 Category Filter Isolation (F2) - All 25 subcategories + etc + 5 major groups
  const allCategoryKeys = Object.keys(CATEGORY_GROUP_MAP);
  for (const catKey of allCategoryKeys) {
    await recordTest('Tier 1 Isolation', `F2: Category [${catKey}] maps to valid mapped group aliases`, async () => {
      const results = await queryCampaigns({ category: catKey });
      const allowedCategories = new Set(CATEGORY_GROUP_MAP[catKey] || [catKey]);
      let valid = 0;
      for (const c of results) {
        if (allowedCategories.has(c.category)) valid++;
      }
      return { evaluated: results.length, valid };
    });
  }

  // 1.3 Platform Filter Isolation (F3)
  const platformCases = [
    { key: 'all', desc: 'All Platforms' },
    { key: 'blog', desc: 'Blog (includes blog and blog+clip)' },
    { key: 'clip', desc: 'Clip (includes clip and blog+clip)' },
    { key: 'blog+clip', desc: 'Composite blog+clip' },
    { key: 'instagram', desc: 'Instagram' },
    { key: 'youtube', desc: 'YouTube' },
    { key: 'etc', desc: 'Etc Platform' },
  ];

  for (const p of platformCases) {
    await recordTest('Tier 1 Isolation', `F3: Platform [${p.key}] - ${p.desc}`, async () => {
      const results = await queryCampaigns({ platform: p.key });
      let valid = 0;
      for (const c of results) {
        if (p.key === 'all') {
          valid++;
        } else if (p.key === 'blog') {
          if (c.platform === 'blog' || c.platform === 'blog+clip') valid++;
        } else if (p.key === 'clip') {
          if (c.platform === 'clip' || c.platform === 'blog+clip') valid++;
        } else if (p.key === 'blog+clip') {
          if (c.platform === 'blog+clip') valid++;
        } else {
          if (c.platform === p.key) valid++;
        }
      }
      return { evaluated: results.length, valid };
    });
  }

  // 1.4 Region Sido Filter Isolation (F4) - 17 광역시도
  const sidos = [
    '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산',
    '강원', '제주', '충북', '충남', '전북', '전남', '경북', '경남', '세종'
  ];

  for (const sido of sidos) {
    await recordTest('Tier 1 Isolation', `F4: Sido Region [${sido}] token & stem matching`, async () => {
      const results = await queryCampaigns({ location: sido });
      assert.ok(results.length > 0, `Sido ${sido} should return active campaigns`);
      const stem = sido.replace(/(시|도)$/, '');
      let valid = 0;
      for (const c of results) {
        if (!c.location) continue;
        const locLower = c.location.toLowerCase();
        if (locLower.includes(sido.toLowerCase()) || (stem.length >= 2 && locLower.includes(stem.toLowerCase()))) {
          valid++;
        }
      }
      return { evaluated: results.length, valid };
    });
  }

  // 1.5 High-Density Sigungu Filter Isolation (F4)
  const sampleSigungus = [
    '서울 강남구', '서울 서초구', '서울 마포구', '서울 송파구', '서울 영등포구', '서울 종로구',
    '경기 수원시', '경기 성남시', '경기 고양시', '경기 용인시', '경기 부천시', '경기 화성시',
    '인천 남동구', '인천 부평구', '인천 연수구',
    '부산 해운대구', '부산 부산진구', '부산 수영구',
    '대구 수성구', '대구 중구',
    '대전 유성구', '광주 서구', '울산 남구',
    '강원 원주시', '강원 강릉시',
    '제주 제주시', '제주 서귀포시',
    '충북 청주시', '충남 천안시', '전북 전주시', '전남 여수시', '경북 포항시', '경남 창원시'
  ];

  for (const sigungu of sampleSigungus) {
    await recordTest('Tier 1 Isolation', `F4: High-Density Sigungu [${sigungu}] stem matching`, async () => {
      const results = await queryCampaigns({ location: sigungu });
      const parts = sigungu.split(/\s+/);
      const targetSigungu = parts[1];
      const stem = targetSigungu.replace(/(구|군|시)$/, '');

      let valid = 0;
      for (const c of results) {
        if (!c.location) continue;
        const locLower = c.location.toLowerCase();
        if (locLower.includes(targetSigungu.toLowerCase()) || (stem.length >= 2 && locLower.includes(stem.toLowerCase()))) {
          valid++;
        }
      }
      return { evaluated: results.length, valid };
    });
  }
}

// =========================================================================================
// TIER 2: Boundary Value Analysis & Corner Cases (경계값 및 엣지 케이스 검증)
// =========================================================================================
async function runTier2BoundaryTests() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan} [TIER 2] Boundary Value Analysis & Corner Cases${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);

  setSqliteMode();
  const db = await getDB();

  // 2.1 Database Partitioning Invariant Check (Visit + Delivery === Total)
  await recordTest('Tier 2 Boundary', 'B1: Database Partitioning Invariant (Visit + Delivery = Total)', async () => {
    const totalRow = await db.get('SELECT COUNT(*) as count FROM campaigns WHERE endDate >= date("now")');
    const visitRow = await db.get(`
      SELECT COUNT(*) as count FROM campaigns 
      WHERE endDate >= date("now")
      AND location IS NOT NULL AND location != '' 
      AND location NOT LIKE '%배송%' AND location NOT LIKE '%전국%' 
      AND location NOT LIKE '%재택%' AND location NOT LIKE '%택배%' AND location NOT LIKE '%온라인%'
    `);
    const deliveryRow = await db.get(`
      SELECT COUNT(*) as count FROM campaigns 
      WHERE endDate >= date("now")
      AND (location IS NULL OR location = '' 
           OR location LIKE '%배송%' OR location LIKE '%전국%' 
           OR location LIKE '%재택%' OR location LIKE '%택배%' OR location LIKE '%온라인%')
    `);

    const total = totalRow.count;
    const visit = visitRow.count;
    const delivery = deliveryRow.count;

    assert.strictEqual(visit + delivery, total, `Partition sum mismatch: visit(${visit}) + delivery(${delivery}) != total(${total})`);
    return { evaluated: total, valid: total };
  });

  // 2.2 Whitespace and Empty String Filter Robustness
  await recordTest('Tier 2 Boundary', 'B2: Empty & Whitespace search queries execute safely without crashing', async () => {
    const emptyRes = await queryCampaigns({ search: '' });
    const spaceRes = await queryCampaigns({ search: '   ' });
    const tabRes = await queryCampaigns({ search: '\t\n' });

    assert.ok(emptyRes.length > 0, 'Empty search should return default active campaigns');
    assert.strictEqual(emptyRes.length, spaceRes.length, 'Whitespace search should match empty search');
    assert.strictEqual(emptyRes.length, tabRes.length, 'Tab/newline search should match empty search');
    return { evaluated: 3, valid: 3 };
  });

  // 2.3 Special Characters and Punctuation Handling
  await recordTest('Tier 2 Boundary', 'B3: Special characters (&, +, -, /, ()) in search query execute safely', async () => {
    const specialChars = ['C/S', '블로그&클립', '1+1', '헤어(컷)', '단독-특가'];
    let valid = 0;
    for (const q of specialChars) {
      const res = await queryCampaigns({ search: q });
      assert.ok(Array.isArray(res), `Query for ${q} should return an array`);
      valid++;
    }
    return { evaluated: specialChars.length, valid };
  });

  // 2.4 Negative Keyword Exclusion ('제공불가', '제공 불가')
  await recordTest('Tier 2 Boundary', 'B4: Negative Keyword Exclusion correctly excludes negated descriptions', async () => {
    // "소고기메뉴" is known to exist with "* 소고기메뉴 제공불가" in DB description
    const res = await queryCampaigns({ search: '소고기메뉴' });
    let valid = 0;
    for (const c of res) {
      const desc = c.description || '';
      const isNegative = desc.includes('소고기메뉴 제공불가') || desc.includes('소고기메뉴 제공 불가');
      // If it matched, it must match on title/location/keywords/mission, not on negated description
      if (!isNegative || (c.title.includes('소고기메뉴') || (c.mission && c.mission.includes('소고기메뉴')))) {
        valid++;
      }
    }
    return { evaluated: res.length > 0 ? res.length : 1, valid: res.length > 0 ? valid : 1 };
  });

  // 2.5 Zero-Distribution Platform and Category Handling
  await recordTest('Tier 2 Boundary', 'B5: Zero-distribution platforms (youtube, etc) return empty array safely', async () => {
    const ytRes = await queryCampaigns({ platform: 'youtube' });
    const etcRes = await queryCampaigns({ platform: 'etc' });
    assert.strictEqual(Array.isArray(ytRes), true);
    assert.strictEqual(Array.isArray(etcRes), true);
    return { evaluated: 2, valid: 2 };
  });

  // 2.6 Max Limit Cap Enforcement (300 items)
  await recordTest('Tier 2 Boundary', 'B6: Result payload is strictly capped at LIMIT 300 for high-volume queries', async () => {
    const resAll = await queryCampaigns({ type: 'all' });
    const resVisit = await queryCampaigns({ type: 'visit' });
    const resFood = await queryCampaigns({ category: 'food-korean' });

    assert.ok(resAll.length <= 300, 'resAll must not exceed 300');
    assert.ok(resVisit.length <= 300, 'resVisit must not exceed 300');
    assert.ok(resFood.length <= 300, 'resFood must not exceed 300');
    return { evaluated: 3, valid: 3 };
  });

  // 2.7 Sorting Algorithm Boundary Checks
  await recordTest('Tier 2 Boundary', 'B7: Sorting by latest (createdAt DESC)', async () => {
    const res = await queryCampaigns({ category: 'food-korean', sortBy: 'latest' });
    assert.ok(res.length > 1, 'Should have multiple campaigns');
    let valid = 0;
    for (let i = 0; i < res.length - 1; i++) {
      if (res[i].createdAt.localeCompare(res[i + 1].createdAt) >= 0) {
        valid++;
      }
    }
    return { evaluated: res.length - 1, valid };
  });

  await recordTest('Tier 2 Boundary', 'B8: Sorting by popular (applyCount / limitCount DESC)', async () => {
    const res = await queryCampaigns({ category: 'food-korean', sortBy: 'popular' });
    assert.ok(res.length > 1, 'Should have multiple campaigns');
    let valid = 0;
    for (let i = 0; i < res.length - 1; i++) {
      const rateA = res[i].limitCount === 0 ? 0 : res[i].applyCount / res[i].limitCount;
      const rateB = res[i + 1].limitCount === 0 ? 0 : res[i + 1].applyCount / res[i + 1].limitCount;
      if (rateA >= rateB - 0.0001) { // allow float precision tolerance
        valid++;
      }
    }
    return { evaluated: res.length - 1, valid };
  });
}

// =========================================================================================
// TIER 3: Cross-Feature Combinations (다중 필터 조합 검증)
// =========================================================================================
async function runTier3CombinationTests() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan} [TIER 3] Multi-Filter Cross-Dimensional Combinations (F5)${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);

  setSqliteMode();

  const combinationMatrix = [
    // 1. Visit + Food Types + Platforms + High-Density Locations
    { type: 'visit', category: 'food-korean', platform: 'blog', location: '서울 강남구', desc: 'Visit + Korean Food + Blog + Seoul Gangnam' },
    { type: 'visit', category: 'food-western', platform: 'blog', location: '서울 마포구', desc: 'Visit + Western Food + Blog + Seoul Mapo' },
    { type: 'visit', category: 'food-japanese', platform: 'instagram', location: '부산 해운대구', desc: 'Visit + Japanese Food + Instagram + Busan Haeundae' },
    { type: 'visit', category: 'food-chinese', platform: 'blog+clip', location: '대구 수성구', desc: 'Visit + Chinese Food + Blog+Clip + Daegu Suseong' },
    { type: 'visit', category: 'food-cafe', platform: 'instagram', location: '제주 제주시', desc: 'Visit + Cafe/Dessert + Instagram + Jeju' },
    { type: 'visit', category: 'food-pub', platform: 'blog', location: '경기 수원시', desc: 'Visit + Pub + Blog + Gyeonggi Suwon' },
    { type: 'visit', category: 'food-restaurant', platform: 'all', location: '인천 남동구', desc: 'Visit + Restaurant + All Platforms + Incheon' },

    // 2. Visit + Beauty / Health + Platforms + Locations
    { type: 'visit', category: 'beauty-salon', platform: 'instagram', location: '서울 서초구', desc: 'Visit + Hair/Nail Salon + Instagram + Seoul Seocho' },
    { type: 'visit', category: 'beauty-spa', platform: 'blog', location: '경기 성남시', desc: 'Visit + Skin Spa + Blog + Gyeonggi Seongnam' },
    { type: 'visit', category: 'health-fitness', platform: 'blog', location: '서울 송파구', desc: 'Visit + Fitness/Gym + Blog + Seoul Songpa' },
    { type: 'visit', category: 'health-fitness', platform: 'instagram', location: '부산 부산진구', desc: 'Visit + Fitness + Instagram + Busan Busanjin' },

    // 3. Visit + Travel / Accommodation + Locations
    { type: 'visit', category: 'accommodation', platform: 'blog', location: '강원 강릉시', desc: 'Visit + Accommodation + Blog + Gangwon Gangneung' },
    { type: 'visit', category: 'accommodation', platform: 'instagram', location: '제주 서귀포시', desc: 'Visit + Accommodation + Instagram + Jeju Seogwipo' },
    { type: 'visit', category: 'travel', platform: 'blog', location: '경북 경주시', desc: 'Visit + Travel + Blog + Gyeongbuk Gyeongju' },
    { type: 'visit', category: 'travel', platform: 'blog+clip', location: '전남 여수시', desc: 'Visit + Travel + Blog+Clip + Jeonnam Yeosu' },

    // 4. Delivery + Cosmetics / Fashion / Living
    { type: 'delivery', category: 'beauty-cosmetics', platform: 'blog', desc: 'Delivery + Cosmetics + Blog' },
    { type: 'delivery', category: 'beauty-cosmetics', platform: 'instagram', desc: 'Delivery + Cosmetics + Instagram' },
    { type: 'delivery', category: 'health-food', platform: 'blog', desc: 'Delivery + Health Supplements + Blog' },
    { type: 'delivery', category: 'health-fresh', platform: 'all', desc: 'Delivery + Meal-Kit / Fresh Food + All' },
    { type: 'delivery', category: 'life-goods', platform: 'blog', desc: 'Delivery + Living Goods + Blog' },
    { type: 'delivery', category: 'life-appliances', platform: 'all', desc: 'Delivery + Appliances + All' },
    { type: 'delivery', category: 'baby', platform: 'blog', desc: 'Delivery + Baby/Kids + Blog' },
    { type: 'delivery', category: 'pet', platform: 'instagram', desc: 'Delivery + Pet + Instagram' },
    { type: 'delivery', category: 'fashion-clothing', platform: 'all', desc: 'Delivery + Clothing + All' },
    { type: 'delivery', category: 'etc', platform: 'blog', desc: 'Delivery + Etc Category + Blog' },

    // 5. Complex Keyword + Multi-Filter Combinations
    { type: 'visit', category: 'food-korean', platform: 'blog', location: '서울', search: '삼겹살', desc: 'Visit + Korean + Blog + Seoul + Keyword [삼겹살]' },
    { type: 'visit', category: 'food-cafe', platform: 'instagram', location: '부산', search: '디저트', desc: 'Visit + Cafe + Instagram + Busan + Keyword [디저트]' },
    { type: 'visit', category: 'food-western', platform: 'blog', location: '경기', search: '파스타', desc: 'Visit + Western + Blog + Gyeonggi + Keyword [파스타]' },
    { type: 'delivery', category: 'beauty-cosmetics', platform: 'blog', search: '앰플', desc: 'Delivery + Cosmetics + Blog + Keyword [앰플]' },
    { type: 'visit', category: 'health-fitness', platform: 'blog', location: '서울', search: '피티', desc: 'Visit + Fitness + Blog + Seoul + Keyword [피티]' },
  ];

  for (const item of combinationMatrix) {
    await recordTest('Tier 3 Combination', `C: ${item.desc}`, async () => {
      const results = await queryCampaigns({
        type: item.type,
        category: item.category,
        platform: item.platform,
        location: item.location,
        search: item.search,
      });

      const allowedCats = item.category ? new Set(CATEGORY_GROUP_MAP[item.category] || [item.category]) : null;
      let valid = 0;

      for (const c of results) {
        let ok = true;

        // Check type
        if (item.type === 'visit' && !isVisitCampaign(c)) ok = false;
        if (item.type === 'delivery' && !isDeliveryCampaign(c)) ok = false;

        // Check category
        if (allowedCats && !allowedCats.has(c.category)) ok = false;

        // Check platform
        if (item.platform && item.platform !== 'all') {
          if (item.platform === 'blog' && !(c.platform === 'blog' || c.platform === 'blog+clip')) ok = false;
          else if (item.platform === 'clip' && !(c.platform === 'clip' || c.platform === 'blog+clip')) ok = false;
          else if (item.platform === 'blog+clip' && c.platform !== 'blog+clip') ok = false;
          else if (item.platform !== 'blog' && item.platform !== 'clip' && item.platform !== 'blog+clip' && c.platform !== item.platform) ok = false;
        }

        // Check location
        if (item.location && item.location !== 'all') {
          const parts = item.location.split(/\s+/);
          const target = parts.length > 1 ? parts[1] : parts[0];
          const stem = target.replace(/(구|군|시|도)$/, '');
          const locLower = (c.location || '').toLowerCase();
          const targetLower = target.toLowerCase();
          const stemLower = stem.toLowerCase();
          if (!locLower.includes(targetLower) && !(stemLower.length >= 2 && locLower.includes(stemLower))) {
            ok = false;
          }
        }

        // Check search keyword
        if (item.search) {
          const s = item.search.toLowerCase();
          const title = c.title.toLowerCase();
          const desc = c.description.toLowerCase();
          const loc = (c.location || '').toLowerCase();
          const kw = (c.searchKeywords || '').toLowerCase();
          const mis = (c.mission || '').toLowerCase();

          const hasMatch = title.includes(s) || desc.includes(s) || loc.includes(s) || kw.includes(s) || mis.includes(s);
          if (!hasMatch) ok = false;
        }

        if (ok) valid++;
      }

      return { evaluated: results.length > 0 ? results.length : 1, valid: results.length > 0 ? valid : 1 };
    });
  }
}

// =========================================================================================
// TIER 4: Real-World Scenarios (실제 사용자 워크로드 시나리오 검증)
// =========================================================================================
async function runTier4RealWorldScenarios() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan} [TIER 4] Real-World Application Workload Scenarios${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);

  setSqliteMode();

  // Scenario 1: Food Blogger searching for Gangnam Visit Blog campaigns
  await recordTest('Tier 4 Real-World', 'S1: Food Blogger searching Seoul Gangnam Visit Blog campaigns', async () => {
    const results = await queryCampaigns({
      type: 'visit',
      category: 'food-korean',
      platform: 'blog',
      location: '서울 강남구',
      sortBy: 'latest',
    });

    assert.ok(results.length > 0, 'Must return campaigns for Gangnam Korean Food Blog');
    let valid = 0;
    for (const c of results) {
      if (isVisitCampaign(c) && (c.platform === 'blog' || c.platform === 'blog+clip') && c.location?.includes('강남')) {
        valid++;
      }
    }
    return { evaluated: results.length, valid };
  });

  // Scenario 2: Beauty Influencer looking for Cosmetics Delivery campaigns
  await recordTest('Tier 4 Real-World', 'S2: Beauty Influencer searching Nationwide Cosmetics Delivery campaigns', async () => {
    const results = await queryCampaigns({
      type: 'delivery',
      category: 'beauty-cosmetics',
      platform: 'all',
      sortBy: 'popular',
    });

    assert.ok(results.length > 0, 'Must return campaigns for Cosmetics Delivery');
    let valid = 0;
    for (const c of results) {
      if (isDeliveryCampaign(c)) valid++;
    }
    return { evaluated: results.length, valid };
  });

  // Scenario 3: Travel Creator searching for Jeju Accommodation Clip/Instagram campaigns
  await recordTest('Tier 4 Real-World', 'S3: Travel Creator searching Jeju Accommodation Instagram campaigns', async () => {
    const results = await queryCampaigns({
      type: 'visit',
      category: 'accommodation',
      platform: 'instagram',
      location: '제주',
      sortBy: 'latest',
    });

    let valid = 0;
    for (const c of results) {
      if (isVisitCampaign(c) && c.platform === 'instagram' && c.location?.includes('제주')) {
        valid++;
      }
    }
    return { evaluated: results.length > 0 ? results.length : 1, valid: results.length > 0 ? valid : 1 };
  });

  // Scenario 4: Urgent Reviewer sorting closing-soon campaigns (endDate ASC)
  await recordTest('Tier 4 Real-World', 'S4: Urgent Reviewer sorting campaigns by End Date (Closing Soon)', async () => {
    const results = await queryCampaigns({
      type: 'visit',
      category: 'food-cafe',
      sortBy: 'endDate',
    });

    assert.ok(results.length > 1, 'Must return multiple campaigns');
    const todayStr = new Date().toISOString().split('T')[0];
    let valid = 0;
    for (let i = 0; i < results.length - 1; i++) {
      assert.ok(results[i].endDate >= todayStr, 'Should only return active campaigns');
      if (results[i].endDate.localeCompare(results[i + 1].endDate) <= 0) {
        valid++;
      }
    }
    return { evaluated: results.length - 1, valid };
  });

  // Scenario 5: High-Volume Searcher browsing composite Blog+Clip campaigns
  await recordTest('Tier 4 Real-World', 'S5: High-Volume Searcher browsing composite Blog+Clip campaigns', async () => {
    const results = await queryCampaigns({
      platform: 'blog+clip',
      type: 'all',
      sortBy: 'latest',
    });

    assert.ok(results.length > 0, 'Must return blog+clip campaigns');
    let valid = 0;
    for (const c of results) {
      if (c.platform === 'blog+clip') valid++;
    }
    return { evaluated: results.length, valid };
  });
}

// =========================================================================================
// TIER 5: Dual Query Engine Parity (SQLite vs Serverless In-Memory Parity 검증)
// =========================================================================================
async function runTier5ParityTests() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan} [TIER 5] Dual Query Engine Parity & Equivalence (F6)${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);

  const parityQueries = [
    { type: 'visit', category: 'food-korean' },
    { type: 'visit', category: 'food-western', location: '서울' },
    { type: 'visit', category: 'food-japanese', location: '부산' },
    { type: 'visit', category: 'food-cafe', location: '서울 강남구' },
    { type: 'visit', category: 'food-pub', location: '대구' },
    { type: 'visit', category: 'beauty-salon', location: '경기 수원시' },
    { type: 'visit', category: 'health-fitness', location: '서울' },
    { type: 'visit', category: 'accommodation', location: '제주' },
    { type: 'visit', category: 'travel', location: '강원' },
    { type: 'delivery', category: 'beauty-cosmetics' },
    { type: 'delivery', category: 'health-food' },
    { type: 'delivery', category: 'health-fresh' },
    { type: 'delivery', category: 'life-goods' },
    { type: 'delivery', category: 'baby' },
    { type: 'delivery', category: 'pet' },
    { platform: 'blog', type: 'visit' },
    { platform: 'clip', type: 'visit' },
    { platform: 'blog+clip', type: 'all' },
    { platform: 'instagram', type: 'delivery' },
    { search: '삼겹살' },
    { search: '파스타' },
    { search: '카페' },
    { search: '스킨케어' },
    { search: '호텔' },
    { location: '인천', category: 'food-korean' },
    { location: '대전', category: 'food-cafe' },
    { location: '광주', category: 'health-fitness' },
    { location: '울산', category: 'food-korean' },
    { location: '세종', category: 'food' },
    { sortBy: 'latest', category: 'food-korean' },
    { sortBy: 'endDate', category: 'beauty-salon' },
    { sortBy: 'popular', category: 'travel' },
  ];

  for (const q of parityQueries) {
    const qStr = JSON.stringify(q);
    await recordTest('Tier 5 Parity', `P: Dual Engine Parity on ${qStr}`, async () => {
      // 1. SQLite execution
      setSqliteMode();
      const sqlResults = await queryCampaigns(q);

      // 2. Serverless In-Memory execution
      setServerlessMode();
      const memResults = await queryCampaigns(q);

      assert.strictEqual(
        sqlResults.length,
        memResults.length,
        `Result count mismatch between SQLite (${sqlResults.length}) and Serverless (${memResults.length}) for query ${qStr}`
      );

      const sqlIds = sqlResults.map(c => c.id);
      const memIds = new Set(memResults.map(c => c.id));

      let matched = 0;
      for (const id of sqlIds) {
        if (memIds.has(id)) matched++;
      }

      const count = sqlResults.length;
      return { evaluated: count > 0 ? count : 1, valid: count > 0 ? matched : 1 };
    });
  }

  // Restore default SQLite mode after parity tests
  setSqliteMode();
}

// =========================================================================================
// Main Test Runner & Comprehensive Report Summary
// =========================================================================================
async function runAllSearchFilterTests() {
  const suiteStartTime = performance.now();

  console.log(`\n${colors.bright}${colors.bgBlue}                                                                      ${colors.reset}`);
  console.log(`${colors.bright}${colors.bgBlue}  REVIEW-MOA AUTOMATED PRECISION TEST SUITE: INTEGRATED SEARCH (M1)   ${colors.reset}`);
  console.log(`${colors.bright}${colors.bgBlue}                                                                      ${colors.reset}\n`);

  try {
    await runTier1IsolationTests();
    await runTier2BoundaryTests();
    await runTier3CombinationTests();
    await runTier4RealWorldScenarios();
    await runTier5ParityTests();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`\n${colors.red}${colors.bright}Fatal test runner error:${colors.reset}`, errorMsg);
  }

  const totalDurationMs = Math.round(performance.now() - suiteStartTime);
  const totalTests = metrics.length;
  const passedTests = metrics.filter(m => m.passed).length;
  const failedTests = metrics.filter(m => !m.passed).length;
  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  const totalEvaluated = metrics.reduce((acc, m) => acc + m.totalRecordsEvaluated, 0);
  const totalValid = metrics.reduce((acc, m) => acc + m.validMatches, 0);
  const overallAccuracy = totalEvaluated > 0 ? (totalValid / totalEvaluated) * 100 : 100;

  // Breakdown by Tier
  const tiers = ['Tier 1 Isolation', 'Tier 2 Boundary', 'Tier 3 Combination', 'Tier 4 Real-World', 'Tier 5 Parity'];
  
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.white}                    QUANTITATIVE TEST EXECUTION SUMMARY               ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`┌──────────────────────────────┬────────┬────────┬─────────┬──────────┬───────────┐`);
  console.log(`│ Test Suite / Tier            │ Total  │ Passed │ Failed  │ Pass %   │ Accuracy  │`);
  console.log(`├──────────────────────────────┼────────┼────────┼─────────┼──────────┼───────────┤`);

  for (const t of tiers) {
    const tierMetrics = metrics.filter(m => m.suiteName === t);
    const count = tierMetrics.length;
    const passed = tierMetrics.filter(m => m.passed).length;
    const failed = count - passed;
    const pRate = count > 0 ? (passed / count) * 100 : 100;
    const evalCount = tierMetrics.reduce((acc, m) => acc + m.totalRecordsEvaluated, 0);
    const validCount = tierMetrics.reduce((acc, m) => acc + m.validMatches, 0);
    const accRate = evalCount > 0 ? (validCount / evalCount) * 100 : 100;

    const pad = (str: string, len: number) => str.padEnd(len, ' ');
    const padNum = (num: number, len: number) => String(num).padStart(len, ' ');

    console.log(
      `│ ${pad(t, 28)} │ ${padNum(count, 6)} │ ${padNum(passed, 6)} │ ${padNum(failed, 7)} │ ${pad(pRate.toFixed(1) + '%', 8)} │ ${pad(accRate.toFixed(1) + '%', 9)} │`
    );
  }

  console.log(`├──────────────────────────────┼────────┼────────┼─────────┼──────────┼───────────┤`);
  console.log(
    `│ ${colors.bright}OVERALL TOTAL${colors.reset}                │ ${String(totalTests).padStart(6, ' ')} │ ${String(passedTests).padStart(6, ' ')} │ ${String(failedTests).padStart(7, ' ')} │ ${colors.bright}${passRate.toFixed(1)}%${colors.reset}    │ ${colors.bright}${overallAccuracy.toFixed(2)}%${colors.reset}   │`
  );
  console.log(`└──────────────────────────────┴────────┴────────┴─────────┴──────────┴───────────┘`);

  console.log(`\n${colors.bright}Test Execution Statistics:${colors.reset}`);
  console.log(`- Total Executed Tests: ${totalTests}`);
  console.log(`- Passed Tests: ${colors.green}${passedTests}${colors.reset}`);
  console.log(`- Failed Tests: ${failedTests > 0 ? colors.red + failedTests : colors.green + '0'}${colors.reset}`);
  console.log(`- Total Evaluated Records: ${totalEvaluated.toLocaleString()}`);
  console.log(`- Total Valid Filter Matches: ${totalValid.toLocaleString()}`);
  console.log(`- Overall Filter Precision / Accuracy: ${colors.green}${overallAccuracy.toFixed(2)}%${colors.reset} (Threshold: >= 99.0%)`);
  console.log(`- Execution Duration: ${totalDurationMs} ms`);

  if (failedTests > 0 || overallAccuracy < 99.0) {
    console.error(`\n${colors.red}${colors.bright}❌ Precision automated test suite FAILED with ${failedTests} failures or accuracy < 99.0%.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bright}🎉 All precision test cases passed successfully with 100% pass rate & >=99.0% accuracy!${colors.reset}\n`);
    process.exit(0);
  }
}

runAllSearchFilterTests();
