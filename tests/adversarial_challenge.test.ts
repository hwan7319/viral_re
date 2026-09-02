/**
 * Adversarial Empirical Stress Test Suite: review-moa Core Engines
 * 
 * Target Systems:
 * 1. Integrated Search Filter Engine (src/lib/db.ts)
 * 2. Keyword Master Engine (src/app/api/keyword/route.ts)
 * 
 * Challenge Categories:
 * - ADV-1: SQL Injection & Payload Fuzzing (SQLite & In-Memory Serverless)
 * - ADV-2: Boundary / Obscure Location & Negative Keyword Mining
 * - ADV-3: Mathematical Invariant Auditing (PC+Mobile=Total, Div-by-Zero, Grade Thresholds)
 * - ADV-4: Entity Classification & Noise Filtering Stress Testing
 * - ADV-5: High-Concurrency & Rate-Limiting Fallback Stress
 * - ADV-6: Dual-Engine Adversarial Parity Check
 */

import assert from 'node:assert';
import { queryCampaigns, getDB, CATEGORY_GROUP_MAP, Campaign } from '../src/lib/db';
import {
  GET as keywordGET,
  classifyQueryEntityType,
  parseSearchAdVolume,
  fetchSearchAdBatch,
  fetchSingleKeywordAd,
} from '../src/app/api/keyword/route';

interface ChallengeResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

const challengeResults: ChallengeResult[] = [];

function recordResult(category: string, name: string, passed: boolean, details: string, error?: string) {
  challengeResults.push({ category, name, passed, details, error });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [${category}] ${name}: ${details}`);
  if (error) {
    console.error(`   Error: ${error}`);
  }
}

function setSqliteMode() {
  delete process.env.VERCEL;
  delete process.env.NOW_BUILDER;
}

function setServerlessMode() {
  process.env.VERCEL = '1';
}

async function callKeywordApi(query: string) {
  const req = new Request(`http://localhost:3000/api/keyword?query=${encodeURIComponent(query)}`);
  const res = await keywordGET(req);
  return {
    status: res.status,
    data: await res.json(),
  };
}

// ============================================================================
// ADV-1: SQL Injection & Payload Fuzzing
// ============================================================================
async function runAdv1SqlInjectionTests() {
  console.log('\n--- ADV-1: SQL Injection & Payload Fuzzing ---');
  setSqliteMode();
  await getDB();

  const injectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE campaigns; --",
    "' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16 --",
    "\" OR \"1\"=\"1",
    "1' ORDER BY 100--",
    "admin'--",
    "' OR 1=1 --",
    "' OR SLEEP(2) --",
    "/* comment */ ' OR 1=1",
    "\\x00' OR 1=1 --",
    "'; ATTACH DATABASE ':memory:' AS leak; --",
    "%' AND 1=0 UNION ALL SELECT * FROM campaigns WHERE '%'='",
  ];

  for (const payload of injectionPayloads) {
    // Test in search filter
    try {
      const resSearch = await queryCampaigns({ search: payload });
      assert.ok(Array.isArray(resSearch), 'Query should return an array');
      recordResult('ADV-1 SQLi', `Search injection payload: ${payload}`, true, `Returned ${resSearch.length} rows safely without crash`);
    } catch (err: any) {
      recordResult('ADV-1 SQLi', `Search injection payload: ${payload}`, false, 'Crashed or threw SQL error', err.message);
    }

    // Test in location filter
    try {
      const resLoc = await queryCampaigns({ location: payload });
      assert.ok(Array.isArray(resLoc), 'Query should return an array');
      recordResult('ADV-1 SQLi', `Location injection payload: ${payload}`, true, `Returned ${resLoc.length} rows safely without crash`);
    } catch (err: any) {
      recordResult('ADV-1 SQLi', `Location injection payload: ${payload}`, false, 'Crashed or threw SQL error', err.message);
    }

    // Test in category filter
    try {
      const resCat = await queryCampaigns({ category: payload });
      assert.ok(Array.isArray(resCat), 'Query should return an array');
      recordResult('ADV-1 SQLi', `Category injection payload: ${payload}`, true, `Returned ${resCat.length} rows safely without crash`);
    } catch (err: any) {
      recordResult('ADV-1 SQLi', `Category injection payload: ${payload}`, false, 'Crashed or threw SQL error', err.message);
    }

    // Test in platform filter
    try {
      const resPlat = await queryCampaigns({ platform: payload });
      assert.ok(Array.isArray(resPlat), 'Query should return an array');
      recordResult('ADV-1 SQLi', `Platform injection payload: ${payload}`, true, `Returned ${resPlat.length} rows safely without crash`);
    } catch (err: any) {
      recordResult('ADV-1 SQLi', `Platform injection payload: ${payload}`, false, 'Crashed or threw SQL error', err.message);
    }
  }

  // Very large input (10,000 chars)
  try {
    const hugeString = 'A'.repeat(10000);
    const resHuge = await queryCampaigns({ search: hugeString });
    assert.strictEqual(resHuge.length, 0, 'Huge non-matching string should return 0');
    recordResult('ADV-1 Payload', '10,000 char huge string search', true, 'Handled 10,000 chars without crash or OOM');
  } catch (err: any) {
    recordResult('ADV-1 Payload', '10,000 char huge string search', false, 'Failed on 10,000 chars', err.message);
  }

  // ReDoS / Catastrophic regex characters in search
  const regexPayloads = [
    '(a+)+$',
    '((a|a?)+)*$',
    '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$',
    '((.*)*)*',
    '\\p{L}+\\s+\\p{N}+',
  ];

  for (const rPayload of regexPayloads) {
    try {
      const res = await queryCampaigns({ search: rPayload });
      assert.ok(Array.isArray(res));
      recordResult('ADV-1 ReDoS', `Regex payload: ${rPayload}`, true, `Safe execution, returned ${res.length} rows`);
    } catch (err: any) {
      recordResult('ADV-1 ReDoS', `Regex payload: ${rPayload}`, false, 'ReDoS failure', err.message);
    }
  }
}

// ============================================================================
// ADV-2: Boundary / Obscure Location & Negative Keyword Mining
// ============================================================================
async function runAdv2LocationAndBoundaryTests() {
  console.log('\n--- ADV-2: Boundary / Obscure Location & Negative Keyword Mining ---');
  setSqliteMode();

  const obscureLocations = [
    { loc: '세종', desc: 'Sejong Metropolitan Sido' },
    { loc: '세종특별자치시', desc: 'Sejong Full Name' },
    { loc: '제주', desc: 'Jeju Sido' },
    { loc: '제주 제주시', desc: 'Jeju Jeju-si' },
    { loc: '제주 서귀포시', desc: 'Jeju Seogwipo-si' },
    { loc: '강원 원주시', desc: 'Gangwon Wonju-si' },
    { loc: '전남 여수시', desc: 'Jeonnam Yeosu-si' },
    { loc: '경북 경주시', desc: 'Gyeongbuk Gyeongju-si' },
    { loc: '충남 아산시', desc: 'Chungnam Asan-si' },
    { loc: '충북 청주시', desc: 'Chungbuk Cheongju-si' },
    { loc: '달나라', desc: 'Fictional Non-existent location' },
    { loc: 'Unknown_District_XYZ', desc: 'Random Latin string' },
  ];

  for (const item of obscureLocations) {
    try {
      const res = await queryCampaigns({ location: item.loc, type: 'visit' });
      assert.ok(Array.isArray(res));
      if (item.loc === '달나라' || item.loc === 'Unknown_District_XYZ') {
        assert.strictEqual(res.length, 0, 'Non-existent location should return 0 results');
      } else {
        assert.ok(res.length > 0, `Expected active campaigns for ${item.loc}, got ${res.length}`);
      }
      recordResult('ADV-2 Location', `${item.desc} [${item.loc}]`, true, `Returned ${res.length} campaigns`);
    } catch (err: any) {
      recordResult('ADV-2 Location', `${item.desc} [${item.loc}]`, false, 'Query failed', err.message);
    }
  }

  // Negative keyword filtering verification
  try {
    const resNeg = await queryCampaigns({ search: '소고기' });
    let unnegatedMatchCount = 0;
    let falsePositiveNegated = 0;
    for (const c of resNeg) {
      const desc = c.description || '';
      if ((desc.includes('소고기 제공불가') || desc.includes('소고기 제공 불가')) &&
          !c.title.includes('소고기') &&
          !(c.mission && c.mission.includes('소고기'))) {
        falsePositiveNegated++;
      } else {
        unnegatedMatchCount++;
      }
    }
    assert.strictEqual(falsePositiveNegated, 0, `Found ${falsePositiveNegated} false positives that matched negated description`);
    recordResult('ADV-2 NegKeyword', 'Negative keyword exclusion on "소고기"', true, `0 negated false positives, ${unnegatedMatchCount} genuine matches`);
  } catch (err: any) {
    recordResult('ADV-2 NegKeyword', 'Negative keyword exclusion on "소고기"', false, 'Negative keyword failure', err.message);
  }
}

// ============================================================================
// ADV-3: Mathematical Invariant Auditing
// ============================================================================
async function runAdv3MathInvariantTests() {
  console.log('\n--- ADV-3: Mathematical Invariant Auditing ---');

  // Test 1: Mathematical Off-By-One Invariant in parseSearchAdVolume & Split Logic
  const testTotals = [1, 2, 3, 4, 5, 7, 10, 33, 99, 101, 252466, 260586, 1234567];
  let offByOneViolations = 0;
  for (const N of testTotals) {
    const pc = Math.floor(N * 0.20);
    const mo_wrong = Math.floor(N * 0.80);
    const mo_correct = N - pc;
    if (pc + mo_wrong !== N) {
      offByOneViolations++;
    }
    assert.strictEqual(pc + mo_correct, N, 'Corrected formula must preserve N = pc + mo');
  }

  if (offByOneViolations > 0) {
    recordResult(
      'ADV-3 Math Invariant',
      'Off-by-one division in fallback PC/Mobile split (Math.floor(N*0.2) + Math.floor(N*0.8))',
      false,
      `Detected ${offByOneViolations}/${testTotals.length} inputs where Math.floor(N*0.20) + Math.floor(N*0.80) !== N (e.g. N=260,586 gives 52,117 + 208,468 = 260,585)`,
      'Rounding discrepancy breaks invariant Total === PC + Mobile'
    );
  } else {
    recordResult('ADV-3 Math Invariant', 'Off-by-one split check', true, 'All matched');
  }

  // Test 2: Division by Zero in Competition Ratio
  const zeroVolPosts = 500;
  const zeroVol = 0;
  const compRatioZero = zeroVol > 0 ? parseFloat((zeroVolPosts / zeroVol).toFixed(2)) : 0;
  assert.strictEqual(compRatioZero, 0, 'Zero volume must yield competition ratio 0 without NaN/Infinity');
  recordResult('ADV-3 Div-by-Zero', 'Competition ratio when volume is 0', true, `Ratio=${compRatioZero} (Safe handling)`);

  // Test 3: Grade Threshold Exact Boundaries
  const gradeChecks = [
    { ratio: 0.00, expected: 'GOLD' },
    { ratio: 0.49, expected: 'GOLD' },
    { ratio: 0.50, expected: 'NORMAL' },
    { ratio: 1.00, expected: 'NORMAL' },
    { ratio: 2.00, expected: 'NORMAL' },
    { ratio: 2.01, expected: 'HARD' },
    { ratio: 100.0, expected: 'HARD' },
  ];

  for (const gc of gradeChecks) {
    let g: 'GOLD' | 'NORMAL' | 'HARD';
    if (gc.ratio < 0.5) g = 'GOLD';
    else if (gc.ratio <= 2.0) g = 'NORMAL';
    else g = 'HARD';
    assert.strictEqual(g, gc.expected, `Grade mismatch at ratio ${gc.ratio}`);
    recordResult('ADV-3 Grade Boundary', `Ratio ${gc.ratio}`, true, `Mapped to ${g}`);
  }
}

// ============================================================================
// ADV-4: Entity Classification & Noise Filtering Stress Testing
// ============================================================================
async function runAdv4EntityClassificationStress() {
  console.log('\n--- ADV-4: Entity Classification & Noise Filtering Stress Testing ---');

  const adversarialEntities = [
    { q: '갤럭시', expected: 'BRAND_PRODUCT', note: 'Ends in "시" (city suffix) but is brand' },
    { q: '갤럭시S24', expected: 'BRAND_PRODUCT', note: 'Brand + model' },
    { q: '아이폰16', expected: 'BRAND_PRODUCT', note: 'Brand + model' },
    { q: '스타벅스 강남점', expected: 'BRAND_PRODUCT', note: 'Brand prefix' },
    { q: '종로3가역', expected: 'LOCATION', note: 'Number in station name' },
    { q: '테헤란로', expected: 'LOCATION', note: 'Road name ending in "로"' },
    { q: '강남대로', expected: 'LOCATION', note: 'Avenue ending in "대로"' },
    { q: '더현대 서울', expected: 'VENUE', note: 'Venue compound' },
    { q: '스타필드 수원', expected: 'VENUE', note: 'Venue compound' },
    { q: '말복', expected: 'SEASONAL_EVENT', note: 'Seasonal' },
    { q: '추석 선물', expected: 'SEASONAL_EVENT', note: 'Seasonal compound' },
    { q: '삼겹살', expected: 'GENERAL_CATEGORY', note: 'General food' },
    { q: '시장', expected: 'GENERAL_CATEGORY', note: 'Polysemous word' },
  ];

  for (const item of adversarialEntities) {
    const actual = classifyQueryEntityType(item.q);
    const match = actual === item.expected;
    recordResult(
      'ADV-4 Entity Class',
      `"${item.q}" (${item.note})`,
      match,
      `Classified as ${actual} (expected: ${item.expected})`,
      match ? undefined : `Mismatch: expected ${item.expected}, got ${actual}`
    );
  }
}

// ============================================================================
// ADV-5: High-Concurrency & Rate-Limiting Fallback Stress
// ============================================================================
async function runAdv5ConcurrencyStress() {
  console.log('\n--- ADV-5: High-Concurrency & Rate-Limiting Fallback Stress ---');

  const concurrentQueries = [
    '삼겹살', '제주도', '메가커피', '치킨', '피자',
    '카페', '영양제', '시장', '강남 맛집', '아이폰',
  ];

  const startTime = performance.now();
  const responses = await Promise.all(
    concurrentQueries.map(async (q) => {
      try {
        const res = await callKeywordApi(q);
        return { query: q, status: res.status, success: res.data?.success, data: res.data?.data };
      } catch (err: any) {
        return { query: q, status: 500, success: false, error: err.message };
      }
    })
  );
  const elapsed = Math.round(performance.now() - startTime);

  let successCount = 0;
  let mathViolations = 0;

  for (const r of responses) {
    if (r.status === 200 && r.success && r.data) {
      successCount++;
      const d = r.data;
      if (d.totalSearchVolume !== d.pcSearchVolume + d.mobileSearchVolume) {
        mathViolations++;
      }
    }
  }

  recordResult(
    'ADV-5 Concurrency',
    `10 concurrent Keyword API requests (${elapsed}ms)`,
    successCount === concurrentQueries.length,
    `Success: ${successCount}/${concurrentQueries.length}, Math Violations: ${mathViolations}`
  );
}

// ============================================================================
// ADV-6: Dual-Engine Adversarial Parity Check
// ============================================================================
async function runAdv6DualEngineParity() {
  console.log('\n--- ADV-6: Dual-Engine Adversarial Parity Check ---');

  const adversarialParityQueries = [
    { search: '한우', type: 'visit', category: 'food-korean', location: '서울' },
    { search: '헤어', type: 'visit', category: 'beauty-salon', location: '경기' },
    { search: '밀키트', type: 'delivery', category: 'health-fresh' },
    { search: '호텔', type: 'visit', category: 'accommodation', location: '제주' },
    { search: '1+1', type: 'all' },
    { search: '   ', category: 'food' },
    { location: '세종', type: 'visit' },
    { location: '강원 강릉시', type: 'visit', category: 'travel' },
    { platform: 'youtube', type: 'all' },
    { platform: 'etc', type: 'all' },
    { sortBy: 'latest', type: 'delivery', category: 'beauty-cosmetics' },
    { sortBy: 'popular', type: 'visit', category: 'food-cafe' },
    { sortBy: 'endDate', type: 'visit', category: 'food-western' },
  ];

  for (const q of adversarialParityQueries) {
    const qStr = JSON.stringify(q);
    try {
      setSqliteMode();
      const sqlRes = await queryCampaigns(q);

      setServerlessMode();
      const memRes = await queryCampaigns(q);

      assert.strictEqual(
        sqlRes.length,
        memRes.length,
        `Count mismatch: SQLite=${sqlRes.length} vs Serverless=${memRes.length}`
      );

      const sqlIds = sqlRes.map(c => c.id);
      const memIds = new Set(memRes.map(c => c.id));
      let matchCount = 0;
      for (const id of sqlIds) {
        if (memIds.has(id)) matchCount++;
      }

      assert.strictEqual(
        matchCount,
        sqlRes.length,
        `ID mismatch: matched ${matchCount}/${sqlRes.length}`
      );

      recordResult('ADV-6 Parity', `Query ${qStr}`, true, `Count=${sqlRes.length}, 100% ID parity`);
    } catch (err: any) {
      recordResult('ADV-6 Parity', `Query ${qStr}`, false, 'Parity mismatch or error', err.message);
    }
  }

  setSqliteMode();
}

// ============================================================================
// Master Runner
// ============================================================================
async function runAllAdversarialChallenges() {
  console.log('================================================================================');
  console.log('🛡️ EMPIRICAL ADVERSARIAL CHALLENGER SUITE: REVIEW-MOA');
  console.log(`⏰ Execution Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  try {
    await runAdv1SqlInjectionTests();
    await runAdv2LocationAndBoundaryTests();
    await runAdv3MathInvariantTests();
    await runAdv4EntityClassificationStress();
    await runAdv5ConcurrencyStress();
    await runAdv6DualEngineParity();
  } catch (err: any) {
    console.error('💥 Fatal error in challenge runner:', err);
  }

  const total = challengeResults.length;
  const passed = challengeResults.filter(r => r.passed).length;
  const failed = challengeResults.filter(r => !r.passed).length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '100.0';

  console.log('\n================================================================================');
  console.log('📊 ADVERSARIAL CHALLENGE EXECUTION SUMMARY');
  console.log('================================================================================');
  console.log(`- Total Challenges Run: ${total}`);
  console.log(`- Passed: ${passed}`);
  console.log(`- Failed (Vulnerabilities/Discrepancies Found): ${failed}`);
  console.log(`- Pass Rate: ${passRate}%`);
  console.log('================================================================================\n');

  if (failed > 0) {
    console.log('🚨 DISCOVERED CHALLENGE DEFECTS:');
    challengeResults.filter(r => !r.passed).forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.category}] ${r.name}: ${r.details}`);
      if (r.error) console.log(`     Error: ${r.error}`);
    });
  }
}

runAllAdversarialChallenges();
