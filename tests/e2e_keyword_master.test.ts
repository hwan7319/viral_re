/**
 * E2E Precision Automated Test Suite: Keyword Master Engine
 * 
 * Target Endpoint: src/app/api/keyword/route.ts
 * Coverage:
 *  - Tier 1: Isolation & Unit Functions (Entity classification, Search volume parsing, Mathematical consistency, Competition ratio & Grade mapping)
 *  - Tier 2: Boundary Value Analysis & Edge Cases (Empty/Whitespace/Special character queries, Zero volume / High volume handling, Rate-limit fallback)
 *  - Tier 3: Category Presets, Priority Hierarchy & Noise Filtering (9 Core Presets, Priority 1/2/3 preservation, Noise filtering)
 *  - Tier 4: Real-World Scenarios & Representative Keyword Groups (다의어 '시장', 카테고리 '삼겹살', 브랜드 '메가커피', 지역 '제주도', 복합어 '강남 맛집' + Boundary terms '카페', '치킨', '영양제', '피자', '미용실', '아이폰')
 *  - Tier 5: Search Volume 100% Synchronization & 2nd Hint Collection Engine (PC + Mobile = Total math invariant, 100% detail synchronization, 2nd hint extraction)
 */

import assert from 'assert';
import {
  GET,
  classifyQueryEntityType,
  parseSearchAdVolume,
  fetchSearchAdBatch,
  fetchSingleKeywordAd,
} from '../src/app/api/keyword/route';

// Test statistics tracker
interface TestStats {
  tierName: string;
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

const statsList: TestStats[] = [];
let currentTierStats: TestStats = {
  tierName: 'Initial',
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

function startTier(name: string) {
  currentTierStats = {
    tierName: name,
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
  };
  statsList.push(currentTierStats);
  console.log(`\n================================================================================`);
  console.log(`🚀 ${name}`);
  console.log(`================================================================================`);
}

function recordPass(testName: string, detail?: string) {
  currentTierStats.total++;
  currentTierStats.passed++;
  const msg = detail ? `✅ PASS: ${testName} (${detail})` : `✅ PASS: ${testName}`;
  console.log(msg);
}

function recordFail(testName: string, error: unknown) {
  currentTierStats.total++;
  currentTierStats.failed++;
  const errStr = error instanceof Error ? error.message : String(error);
  currentTierStats.errors.push(`${testName}: ${errStr}`);
  console.error(`❌ FAIL: ${testName} -> ${errStr}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RelatedKeywordItem {
  rank: number;
  keyword: string;
  priority: number;
  isOfficial?: boolean;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  totalPosts: number;
  monthlyPosts: number;
  competitionRatio: number;
  grade: 'GOLD' | 'NORMAL' | 'HARD';
  gradeLabel: string;
  recentDate: string;
}

interface KeywordData {
  keyword: string;
  mainKeyword: string;
  entityType: 'LOCATION' | 'VENUE' | 'SEASONAL_EVENT' | 'BRAND_PRODUCT' | 'GENERAL_CATEGORY';
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  pcRatio: number;
  mobileRatio: number;
  adCompIdx: string;
  adPlAvgDepth: number;
  pcClickCount: number;
  mobileClickCount: number;
  totalClickCount: number;
  totalPosts: number;
  monthlyPosts: number;
  competitionRatio: number;
  grade: 'GOLD' | 'NORMAL' | 'HARD';
  statusText: string;
  isRealSearchAdData: boolean;
  relatedKeywords: RelatedKeywordItem[];
  topPosts: Array<{
    title: string;
    link: string;
    bloggerName: string;
    bloggerLink: string;
    postDate: string;
  }>;
  timestamp: string;
}

interface KeywordApiResponse {
  success: boolean;
  error?: string;
  data?: KeywordData;
}

// Helper to invoke Next.js route GET handler
async function callKeywordApi(query: string): Promise<KeywordApiResponse> {
  const req = new Request(`http://localhost:3000/api/keyword?query=${encodeURIComponent(query)}`);
  const res = await GET(req);
  return (await res.json()) as KeywordApiResponse;
}

// ============================================================================
// TIER 1: ISOLATION & UNIT FUNCTION TESTS
// ============================================================================
async function runTier1() {
  startTier('Tier 1: Isolation & Unit Function Verification');

  // T1.1: Entity Classification Engine (classifyQueryEntityType)
  const classificationCases: Array<{ query: string; expected: string }> = [
    // LOCATION
    { query: '제주도', expected: 'LOCATION' },
    { query: '제주', expected: 'LOCATION' },
    { query: '강남', expected: 'LOCATION' },
    { query: '홍대', expected: 'LOCATION' },
    { query: '해운대', expected: 'LOCATION' },
    { query: '판교', expected: 'LOCATION' },
    { query: '서면', expected: 'LOCATION' },
    { query: '강남 맛집', expected: 'LOCATION' },
    { query: '종로3가역', expected: 'LOCATION' },
    { query: '마포구', expected: 'LOCATION' },
    { query: '해운대해수욕장', expected: 'LOCATION' },
    { query: '인천공항', expected: 'LOCATION' },
    { query: '설악산', expected: 'LOCATION' },
    { query: '테헤란로', expected: 'LOCATION' },

    // VENUE
    { query: '더현대', expected: 'VENUE' },
    { query: '더현대 서울', expected: 'VENUE' },
    { query: '스타필드', expected: 'VENUE' },
    { query: '스타필드 수원', expected: 'VENUE' },
    { query: '코엑스', expected: 'VENUE' },
    { query: '롯데몰', expected: 'VENUE' },
    { query: '타임스퀘어', expected: 'VENUE' },
    { query: '신세계백화점', expected: 'VENUE' },
    { query: '현대백화점', expected: 'VENUE' },
    { query: '신세계아울렛', expected: 'VENUE' },
    { query: '아이파크몰', expected: 'VENUE' },
    { query: '센텀시티', expected: 'VENUE' },

    // SEASONAL_EVENT
    { query: '말복', expected: 'SEASONAL_EVENT' },
    { query: '초복', expected: 'SEASONAL_EVENT' },
    { query: '중복', expected: 'SEASONAL_EVENT' },
    { query: '복날', expected: 'SEASONAL_EVENT' },
    { query: '입추', expected: 'SEASONAL_EVENT' },
    { query: '추석', expected: 'SEASONAL_EVENT' },
    { query: '설날', expected: 'SEASONAL_EVENT' },
    { query: '명절', expected: 'SEASONAL_EVENT' },
    { query: '크리스마스', expected: 'SEASONAL_EVENT' },
    { query: '빼빼로데이', expected: 'SEASONAL_EVENT' },
    { query: '어린이날', expected: 'SEASONAL_EVENT' },
    { query: '어버이날', expected: 'SEASONAL_EVENT' },

    // BRAND_PRODUCT
    { query: '메가커피', expected: 'BRAND_PRODUCT' },
    { query: '컴포즈', expected: 'BRAND_PRODUCT' },
    { query: '빽다방', expected: 'BRAND_PRODUCT' },
    { query: '스타벅스', expected: 'BRAND_PRODUCT' },
    { query: '교촌치킨', expected: 'BRAND_PRODUCT' },
    { query: 'bhc', expected: 'BRAND_PRODUCT' },
    { query: 'bbq', expected: 'BRAND_PRODUCT' },
    { query: '굽네', expected: 'BRAND_PRODUCT' },
    { query: '아이폰', expected: 'BRAND_PRODUCT' },
    { query: '갤럭시', expected: 'BRAND_PRODUCT' },
    { query: '다이슨', expected: 'BRAND_PRODUCT' },
    { query: '올리브영', expected: 'BRAND_PRODUCT' },
    { query: '오케스트로', expected: 'BRAND_PRODUCT' },
    { query: '두산로보틱스', expected: 'BRAND_PRODUCT' },

    // GENERAL_CATEGORY
    { query: '삼겹살', expected: 'GENERAL_CATEGORY' },
    { query: '시장', expected: 'GENERAL_CATEGORY' },
    { query: '카페', expected: 'GENERAL_CATEGORY' },
    { query: '치킨', expected: 'GENERAL_CATEGORY' },
    { query: '영양제', expected: 'GENERAL_CATEGORY' },
    { query: '피자', expected: 'GENERAL_CATEGORY' },
    { query: '미용실', expected: 'GENERAL_CATEGORY' },
    { query: '원피스', expected: 'GENERAL_CATEGORY' },
    { query: '키보드', expected: 'GENERAL_CATEGORY' },
    { query: '모니터', expected: 'GENERAL_CATEGORY' },
  ];

  for (const c of classificationCases) {
    try {
      const actual = classifyQueryEntityType(c.query);
      assert.strictEqual(actual, c.expected, `Classification mismatch for "${c.query}"`);
      recordPass(`classifyQueryEntityType("${c.query}")`, `-> ${actual}`);
    } catch (err) {
      recordFail(`classifyQueryEntityType("${c.query}")`, err);
    }
  }

  // T1.2: Search Volume Parser (parseSearchAdVolume)
  const volumeParsingCases: Array<{ input: unknown; expected: number }> = [
    { input: 12345, expected: 12345 },
    { input: 0, expected: 0 },
    { input: '12345', expected: 12345 },
    { input: '1,234,567', expected: 1234567 },
    { input: '< 10', expected: 5 },
    { input: '<10', expected: 5 },
    { input: '< 5', expected: 5 },
    { input: '', expected: 5 },
    { input: 'invalid_string', expected: 5 },
    { input: null, expected: 0 },
    { input: undefined, expected: 0 },
  ];

  for (const c of volumeParsingCases) {
    try {
      const actual = parseSearchAdVolume(c.input);
      assert.strictEqual(actual, c.expected, `parseSearchAdVolume failed for input ${JSON.stringify(c.input)}`);
      recordPass(`parseSearchAdVolume(${JSON.stringify(c.input)})`, `-> ${actual}`);
    } catch (err) {
      recordFail(`parseSearchAdVolume(${JSON.stringify(c.input)})`, err);
    }
  }

  // T1.3: Mathematical Formulas (Competition Ratio & Grade Logic)
  const competitionFormulaCases: Array<{ posts: number; volume: number; expectedRatio: number; expectedGrade: string }> = [
    { posts: 100, volume: 1000, expectedRatio: 0.10, expectedGrade: 'GOLD' },
    { posts: 490, volume: 1000, expectedRatio: 0.49, expectedGrade: 'GOLD' },
    { posts: 500, volume: 1000, expectedRatio: 0.50, expectedGrade: 'NORMAL' },
    { posts: 1500, volume: 1000, expectedRatio: 1.50, expectedGrade: 'NORMAL' },
    { posts: 2000, volume: 1000, expectedRatio: 2.00, expectedGrade: 'NORMAL' },
    { posts: 2010, volume: 1000, expectedRatio: 2.01, expectedGrade: 'HARD' },
    { posts: 50000, volume: 1000, expectedRatio: 50.00, expectedGrade: 'HARD' },
    { posts: 0, volume: 1000, expectedRatio: 0.00, expectedGrade: 'GOLD' },
    { posts: 500, volume: 0, expectedRatio: 0.00, expectedGrade: 'GOLD' },
  ];

  for (const c of competitionFormulaCases) {
    try {
      const calcRatio = c.volume > 0 ? parseFloat((c.posts / c.volume).toFixed(2)) : 0;
      assert.strictEqual(calcRatio, c.expectedRatio, `Ratio calculation mismatch`);

      let grade: 'GOLD' | 'NORMAL' | 'HARD';
      if (calcRatio < 0.5) grade = 'GOLD';
      else if (calcRatio <= 2.0) grade = 'NORMAL';
      else grade = 'HARD';

      assert.strictEqual(grade, c.expectedGrade, `Grade mapping mismatch`);
      recordPass(`Competition Formula (${c.posts} / ${c.volume})`, `Ratio=${calcRatio}, Grade=${grade}`);
    } catch (err) {
      recordFail(`Competition Formula (${c.posts} / ${c.volume})`, err);
    }
  }
}

// ============================================================================
// TIER 2: BOUNDARY VALUE ANALYSIS & CORNER CASES
// ============================================================================
async function runTier2() {
  startTier('Tier 2: Boundary Value Analysis & Corner Cases');

  // T2.1: Empty and Whitespace Queries
  try {
    const resEmpty = await callKeywordApi('');
    assert.strictEqual(resEmpty.success, false, 'Empty query should return success: false');
    assert(resEmpty.error, 'Empty query should return error message');
    recordPass('Validation on Empty Query ("")', 'Correctly rejected with 400');
  } catch (err) {
    recordFail('Validation on Empty Query ("")', err);
  }

  try {
    const resSpaces = await callKeywordApi('     ');
    assert.strictEqual(resSpaces.success, false, 'Whitespace-only query should return success: false');
    recordPass('Validation on Whitespace Query ("     ")', 'Correctly rejected with 400');
  } catch (err) {
    recordFail('Validation on Whitespace Query ("     ")', err);
  }

  // T2.2: Queries with Leading/Trailing Whitespace
  try {
    const resPadded = await callKeywordApi('  삼겹살  ');
    assert.strictEqual(resPadded.success, true, 'Padded query should succeed');
    assert.strictEqual(resPadded.data.keyword, '삼겹살', 'Keyword should be trimmed');
    recordPass('Query Trimming ("  삼겹살  ")', `Trimmed to "${resPadded.data.keyword}"`);
  } catch (err) {
    recordFail('Query Trimming ("  삼겹살  ")', err);
  }

  // T2.3: Special Characters and Punctuation
  const specialQueries = ['삼겹살!', '제주도@', '강남#맛집'];
  for (const sq of specialQueries) {
    try {
      await sleep(150);
      const res = await callKeywordApi(sq);
      assert.strictEqual(res.success, true, `Special query "${sq}" should be processed gracefully`);
      assert(res.data.totalSearchVolume >= 0, `Search volume should be non-negative`);
      recordPass(`Special Character Query ("${sq}")`, `Success, TotalVol=${res.data.totalSearchVolume}`);
    } catch (err) {
      recordFail(`Special Character Query ("${sq}")`, err);
    }
  }

  // T2.4: Single Character Query
  try {
    await sleep(150);
    const resSingle = await callKeywordApi('닭');
    assert.strictEqual(resSingle.success, true, 'Single character query should execute without crash');
    assert(resSingle.data.relatedKeywords.length > 0, 'Should return related keywords for single char query');
    recordPass('Single Character Query ("닭")', `Returned ${resSingle.data.relatedKeywords.length} related keywords`);
  } catch (err) {
    recordFail('Single Character Query ("닭")', err);
  }

  // T2.5: English and Alphanumeric Brand Query
  try {
    await sleep(150);
    const resIphone = await callKeywordApi('아이폰');
    assert.strictEqual(resIphone.success, true, 'Brand query "아이폰" should succeed');
    assert.strictEqual(resIphone.data.entityType, 'BRAND_PRODUCT', 'Should classify as BRAND_PRODUCT');
    assert(resIphone.data.totalSearchVolume > 0, 'Should have positive total search volume');
    recordPass('Brand / Product Query ("아이폰")', `EntityType=${resIphone.data.entityType}, Volume=${resIphone.data.totalSearchVolume.toLocaleString()}`);
  } catch (err) {
    recordFail('Brand / Product Query ("아이폰")', err);
  }
}

// ============================================================================
// TIER 3: CATEGORY PRESETS, PRIORITY HIERARCHY & NOISE FILTERING
// ============================================================================
async function runTier3() {
  startTier('Tier 3: Category Presets, Priority Hierarchy & Noise Filtering');

  // T3.1: 9 Core Category Presets Verification
  const PRESET_KEYWORDS = [
    '메가커피',
    '커피',
    '제주도',
    '치킨',
    '삼겹살',
    '피자',
    '카페',
    '영양제',
    '시장',
  ];

  for (const pk of PRESET_KEYWORDS) {
    try {
      await sleep(250);
      const res = await callKeywordApi(pk);
      assert.strictEqual(res.success, true, `API call failed for preset keyword "${pk}"`);
      const related = res.data.relatedKeywords || [];
      assert(related.length > 0, `Preset keyword "${pk}" must return related keywords`);

      // Verify that Priority 1 items exist
      const p1Items = related.filter((r: { priority?: number }) => r.priority === 1);
      assert(p1Items.length > 0, `Preset keyword "${pk}" must contain Priority 1 candidates`);

      // Verify priority ordering: priority must be monotonic non-decreasing (1 <= 2 <= 3)
      for (let i = 0; i < related.length - 1; i++) {
        const currP = related[i].priority || 3;
        const nextP = related[i + 1].priority || 3;
        assert(
          currP <= nextP,
          `Priority ordering violated at index ${i}: #${related[i].rank} (P${currP}) followed by #${related[i + 1].rank} (P${nextP})`
        );
        // If same priority, search volume should be descending
        if (currP === nextP) {
          assert(
            related[i].totalSearchVolume >= related[i + 1].totalSearchVolume,
            `Volume ordering violated at index ${i} within Priority ${currP}: ${related[i].keyword}(${related[i].totalSearchVolume}) < ${related[i + 1].keyword}(${related[i + 1].totalSearchVolume})`
          );
        }
      }

      recordPass(
        `Category Preset & Priority Preservation ("${pk}")`,
        `Count=${related.length}, P1_Count=${p1Items.length}, Ranking=Strictly Ordered`
      );
    } catch (err) {
      recordFail(`Category Preset & Priority Preservation ("${pk}")`, err);
    }
  }

  // T3.2: Noise Filtering Integrity Verification
  // Test that food queries do not contain irrelevant seasonal event noise or real estate noise
  try {
    await sleep(250);
    const resFood = await callKeywordApi('삼겹살');
    const related = resFood.data?.relatedKeywords || [];
    const seasonalNoise = /(말복|초복|중복|복날|추석|설날|명절|입추|입동|동지|단오|어버이날|스승의날|어린이날|크리스마스)/;
    const realEstateNoise = /(매매|부동산|원룸|투룸|빌라|주식|대출)/;

    const noiseItems = related.filter(
      (r: { keyword: string }) => seasonalNoise.test(r.keyword) || realEstateNoise.test(r.keyword)
    );

    assert.strictEqual(
      noiseItems.length,
      0,
      `Found ${noiseItems.length} noise items in "삼겹살": ${noiseItems.map((n: { keyword: string }) => n.keyword).join(', ')}`
    );
    recordPass('Noise Filtering on General Category ("삼겹살")', '0% seasonal / real estate noise leakage');
  } catch (err) {
    recordFail('Noise Filtering on General Category ("삼겹살")', err);
  }

  // T3.3: Polysemous Noise Filtering on "시장"
  try {
    await sleep(250);
    const resMarket = await callKeywordApi('시장');
    const related = resMarket.data?.relatedKeywords || [];
    // Top results should feature real traditional/regional markets
    const marketNames = ['광장시장', '남대문시장', '벼룩시장', '속초중앙시장', '강릉중앙시장', '가락시장', '서문시장', '제주동문시장'];
    const foundMarkets = related.filter((r: { keyword: string }) => marketNames.some((m) => r.keyword.includes(m)));

    assert(foundMarkets.length >= 5, `Expected at least 5 authentic market keywords in top related keywords, found ${foundMarkets.length}`);
    recordPass('Polysemous Disambiguation ("시장")', `Found ${foundMarkets.length} authentic traditional markets in top rankings`);
  } catch (err) {
    recordFail('Polysemous Disambiguation ("시장")', err);
  }
}

// ============================================================================
// TIER 4: REAL-WORLD SCENARIOS & REPRESENTATIVE KEYWORD GROUPS
// ============================================================================
async function runTier4() {
  startTier('Tier 4: Real-World Scenarios & Representative Keyword Groups');

  const representativeGroups = [
    {
      group: '다의어 (Polysemous)',
      keyword: '시장',
      expectedEntity: 'GENERAL_CATEGORY',
      expectedKeywordsInList: ['광장시장', '속초중앙시장', '강릉중앙시장'],
    },
    {
      group: '카테고리 (Category)',
      keyword: '삼겹살',
      expectedEntity: 'GENERAL_CATEGORY',
      expectedKeywordsInList: ['대패삼겹살', '솥뚜껑삼겹살', '삼겹살맛집'],
    },
    {
      group: '브랜드 (Brand)',
      keyword: '메가커피',
      expectedEntity: 'BRAND_PRODUCT',
      expectedKeywordsInList: ['스타벅스', '컴포즈커피', '빽다방'],
    },
    {
      group: '지역 (Location)',
      keyword: '제주도',
      expectedEntity: 'LOCATION',
      expectedKeywordsInList: ['제주도 맛집', '제주도 렌트카', '제주도 날씨'],
    },
    {
      group: '복합어 (Compound)',
      keyword: '강남 맛집',
      expectedEntity: 'LOCATION',
      expectedKeywordsInList: ['강남 맛집 추천', '신세계 강남 맛집'],
    },
    {
      group: '경계/코너 (Corner - Category)',
      keyword: '카페',
      expectedEntity: 'GENERAL_CATEGORY',
      expectedKeywordsInList: ['성수동카페', '디저트카페'],
    },
    {
      group: '경계/코너 (Corner - Food)',
      keyword: '치킨',
      expectedEntity: 'GENERAL_CATEGORY',
      expectedKeywordsInList: ['교촌치킨', 'BHC치킨'],
    },
    {
      group: '경계/코너 (Corner - Health)',
      keyword: '영양제',
      expectedEntity: 'GENERAL_CATEGORY',
      expectedKeywordsInList: ['오메가3', '유산균', '마그네슘'],
    },
    {
      group: '경계/코너 (Corner - Food)',
      keyword: '피자',
      expectedEntity: 'GENERAL_CATEGORY',
      expectedKeywordsInList: ['도미노피자', '피자헛'],
    },
    {
      group: '경계/코너 (Corner - Beauty)',
      keyword: '미용실',
      expectedEntity: 'GENERAL_CATEGORY',
      expectedKeywordsInList: [],
    },
    {
      group: '경계/코너 (Corner - Tech Brand)',
      keyword: '아이폰',
      expectedEntity: 'BRAND_PRODUCT',
      expectedKeywordsInList: [],
    },
  ];

  for (const item of representativeGroups) {
    try {
      await sleep(350); // Throttling for external APIs
      const res = await callKeywordApi(item.keyword);
      assert.strictEqual(res.success, true, `API failed for "${item.keyword}"`);
      const data = res.data;

      // 1. Entity type check
      assert.strictEqual(
        data.entityType,
        item.expectedEntity,
        `Entity type mismatch for "${item.keyword}": expected ${item.expectedEntity}, got ${data.entityType}`
      );

      // 2. Volume consistency check (PC + Mobile = Total)
      assert.strictEqual(
        data.totalSearchVolume,
        data.pcSearchVolume + data.mobileSearchVolume,
        `Main keyword volume inconsistency: Total(${data.totalSearchVolume}) !== PC(${data.pcSearchVolume}) + Mo(${data.mobileSearchVolume})`
      );

      // 3. Ratio check
      if (data.totalSearchVolume > 0) {
        const expectedPcRatio = parseFloat(((data.pcSearchVolume / data.totalSearchVolume) * 100).toFixed(1));
        const expectedMoRatio = parseFloat(((data.mobileSearchVolume / data.totalSearchVolume) * 100).toFixed(1));
        assert.strictEqual(data.pcRatio, expectedPcRatio, `PC Ratio mismatch for "${item.keyword}"`);
        assert.strictEqual(data.mobileRatio, expectedMoRatio, `Mobile Ratio mismatch for "${item.keyword}"`);
      }

      // 4. Competition ratio and grade check
      const calcCompRatio = data.totalSearchVolume > 0 ? parseFloat((data.totalPosts / data.totalSearchVolume).toFixed(2)) : 0;
      assert.strictEqual(
        data.competitionRatio,
        calcCompRatio,
        `Competition ratio mismatch for "${item.keyword}": ${data.competitionRatio} vs ${calcCompRatio}`
      );

      let expectedGrade: 'GOLD' | 'NORMAL' | 'HARD';
      if (calcCompRatio < 0.5) expectedGrade = 'GOLD';
      else if (calcCompRatio <= 2.0) expectedGrade = 'NORMAL';
      else expectedGrade = 'HARD';

      assert.strictEqual(data.grade, expectedGrade, `Grade mismatch for "${item.keyword}"`);

      // 5. Related keywords count and quality check
      const related = data.relatedKeywords || [];
      assert(related.length > 0, `No related keywords returned for "${item.keyword}"`);

      // Verify mathematical volume consistency for all related keywords
      for (const rk of related) {
        assert.strictEqual(
          rk.totalSearchVolume,
          rk.pcSearchVolume + rk.mobileSearchVolume,
          `Related keyword "${rk.keyword}" volume math broken: ${rk.totalSearchVolume} !== ${rk.pcSearchVolume} + ${rk.mobileSearchVolume}`
        );
      }

      // Check expected keywords present
      if (item.expectedKeywordsInList.length > 0) {
        const found = item.expectedKeywordsInList.filter((exp) =>
          related.some((r: { keyword: string }) => r.keyword.replace(/\s+/g, '') === exp.replace(/\s+/g, ''))
        );
        assert(
          found.length > 0,
          `None of expected keywords [${item.expectedKeywordsInList.join(', ')}] found in related list for "${item.keyword}"`
        );
      }

      recordPass(
        `Representative Group [${item.group}]: "${item.keyword}"`,
        `Entity=${data.entityType}, TotalVol=${data.totalSearchVolume.toLocaleString()}, Posts=${data.totalPosts.toLocaleString()}, Ratio=${data.competitionRatio} (${data.grade}), RelatedCount=${related.length}`
      );
    } catch (err) {
      recordFail(`Representative Group [${item.group}]: "${item.keyword}"`, err);
    }
  }
}

// ============================================================================
// TIER 5: SEARCH VOLUME 100% SYNCHRONIZATION & 2ND HINT VERIFICATION
// ============================================================================
async function runTier5() {
  startTier('Tier 5: Search Volume 100% Synchronization & 2nd Hint Verification');

  // T5.1: 2nd Hint Batch Fetcher Unit Test (fetchSearchAdBatch)
  try {
    const customerId = '4483791';
    const searchAdApiKey = '01000000002e29685d306d24ac398cf6c1e5651423d5f52e0fde2be9fe21d4ae5ecf4b4536';
    const searchAdSecretKey = 'AQAAAAAuKWhdMG0krDmM9sHlZRQjyLQLlwgpeeGV/GL98ZKmNA==';

    const testBatchKeywords = ['속초중앙시장', '강릉중앙시장', '대패삼겹살', '컴포즈커피', '제주도맛집'];
    const batchMap = await fetchSearchAdBatch(testBatchKeywords, customerId, searchAdApiKey, searchAdSecretKey);

    assert(batchMap instanceof Map, 'fetchSearchAdBatch should return a Map');
    assert(batchMap.size > 0, 'fetchSearchAdBatch should return search volume data');

    for (const [key, val] of batchMap.entries()) {
      assert.strictEqual(
        val.total,
        val.pc + val.mobile,
        `Batch volume math failed for "${key}": Total(${val.total}) !== PC(${val.pc}) + Mo(${val.mobile})`
      );
    }

    recordPass('2nd Hint Batch Fetcher (fetchSearchAdBatch)', `Fetched ${batchMap.size} keywords with 100% volume math consistency`);
  } catch (err) {
    recordFail('2nd Hint Batch Fetcher (fetchSearchAdBatch)', err);
  }

  // T5.2: 2nd Hint Single Keyword Fetcher Unit Test (fetchSingleKeywordAd)
  try {
    const customerId = '4483791';
    const searchAdApiKey = '01000000002e29685d306d24ac398cf6c1e5651423d5f52e0fde2be9fe21d4ae5ecf4b4536';
    const searchAdSecretKey = 'AQAAAAAuKWhdMG0krDmM9sHlZRQjyLQLlwgpeeGV/GL98ZKmNA==';

    await sleep(200);
    const singleData = await fetchSingleKeywordAd('메가커피', customerId, searchAdApiKey, searchAdSecretKey);
    assert(singleData !== null, 'fetchSingleKeywordAd should return data for "메가커피"');
    assert.strictEqual(
      singleData.total,
      singleData.pc + singleData.mobile,
      `Single keyword volume math failed: ${singleData.total} !== ${singleData.pc} + ${singleData.mobile}`
    );
    recordPass('2nd Hint Single Ad Fetcher (fetchSingleKeywordAd)', `Keyword="${singleData.keyword}", Total=${singleData.total.toLocaleString()} (PC: ${singleData.pc}, Mo: ${singleData.mobile})`);
  } catch (err) {
    recordFail('2nd Hint Single Ad Fetcher (fetchSingleKeywordAd)', err);
  }

  // T5.3: 100% Volume Synchronization between Related List and Single Detail Query
  // Sample keywords from 3 major groups: '삼겹살', '시장', '메가커피'
  const syncTestTargets = [
    { parent: '삼겹살', sampleCount: 5 },
    { parent: '시장', sampleCount: 5 },
    { parent: '메가커피', sampleCount: 5 },
  ];

  let totalSyncChecked = 0;
  let totalSyncMatched = 0;

  for (const target of syncTestTargets) {
    try {
      await sleep(300);
      const parentRes = await callKeywordApi(target.parent);
      assert.strictEqual(parentRes.success, true, `Failed to query parent keyword "${target.parent}"`);
      const relatedList = parentRes.data?.relatedKeywords || [];
      const sampleItems = relatedList.slice(0, target.sampleCount);

      let groupMatches = 0;

      for (const item of sampleItems) {
        await sleep(350); // Throttling to protect Naver SearchAd Rate Limit (429 prevention)
        const singleRes = await callKeywordApi(item.keyword);
        assert.strictEqual(singleRes.success, true, `Failed to query single detail for "${item.keyword}"`);
        const singleData = singleRes.data;

        const listTotal = item.totalSearchVolume;
        const listPc = item.pcSearchVolume;
        const listMobile = item.mobileSearchVolume;

        const singleTotal = singleData.totalSearchVolume;
        const singlePc = singleData.pcSearchVolume;
        const singleMobile = singleData.mobileSearchVolume;

        // Verify 100% volume match
        const isMatched = listTotal === singleTotal && listPc === singlePc && listMobile === singleMobile;
        totalSyncChecked++;

        if (isMatched) {
          totalSyncMatched++;
          groupMatches++;
          recordPass(
            `Volume Sync [${target.parent} -> "${item.keyword}"]`,
            `List(T:${listTotal}, PC:${listPc}, M:${listMobile}) === Single(T:${singleTotal}, PC:${singlePc}, M:${singleMobile}) [100% Match]`
          );
        } else {
          // If API hit 429 during single fetch and used fallback, detail discrepancy
          throw new Error(
            `Volume Mismatch for "${item.keyword}": List(T:${listTotal}, PC:${listPc}, M:${listMobile}) !== Single(T:${singleTotal}, PC:${singlePc}, M:${singleMobile})`
          );
        }
      }

      assert.strictEqual(
        groupMatches,
        sampleItems.length,
        `Synchronization rate for "${target.parent}" was ${groupMatches}/${sampleItems.length}`
      );
    } catch (err) {
      recordFail(`Volume Synchronization for "${target.parent}"`, err);
    }
  }

  // T5.4: Aggregate Synchronization Rate Assertion
  try {
    const syncRate = (totalSyncMatched / totalSyncChecked) * 100;
    assert.strictEqual(
      syncRate,
      100.0,
      `Volume synchronization rate was ${syncRate.toFixed(1)}%, expected 100.0%`
    );
    recordPass('Aggregate Volume Synchronization Rate', `100.0% Match (${totalSyncMatched}/${totalSyncChecked} Verified)`);
  } catch (err) {
    recordFail('Aggregate Volume Synchronization Rate', err);
  }
}

// ============================================================================
// TEST RUNNER & QUANTITATIVE SUMMARY
// ============================================================================
async function runAllTests() {
  console.log(`================================================================================`);
  console.log(`🧪 STARTING KEYWORD MASTER E2E PRECISION TEST SUITE`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`================================================================================\n`);

  const startTime = Date.now();

  try {
    await runTier1();
    await runTier2();
    await runTier3();
    await runTier4();
    await runTier5();
  } catch (globalErr) {
    console.error('💥 Unhandled exception during test suite execution:', globalErr);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print Quantitative Summary Report
  console.log(`\n================================================================================`);
  console.log(`📊 KEYWORD MASTER E2E TEST EXECUTION SUMMARY`);
  console.log(`================================================================================`);
  console.log(`| # | Test Tier | Total | Passed | Failed | Pass Rate | Status |`);
  console.log(`|---|-----------|:-----:|:------:|:------:|:---------:|:------:|`);

  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;

  statsList.forEach((stat, idx) => {
    grandTotal += stat.total;
    grandPassed += stat.passed;
    grandFailed += stat.failed;
    const rate = stat.total > 0 ? ((stat.passed / stat.total) * 100).toFixed(1) : '100.0';
    const status = stat.failed === 0 ? '🟢 PASS' : '🔴 FAIL';
    console.log(
      `| ${idx + 1} | ${stat.tierName.padEnd(52)} | ${String(stat.total).padStart(5)} | ${String(stat.passed).padStart(6)} | ${String(stat.failed).padStart(6)} | ${String(rate + '%').padStart(9)} | ${status} |`
    );
  });

  const grandRate = grandTotal > 0 ? ((grandPassed / grandTotal) * 100).toFixed(1) : '100.0';
  console.log(`================================================================================`);
  console.log(
    `| TOTAL SUMMARY | ${grandTotal} Tests | ${grandPassed} Passed | ${grandFailed} Failed | ${grandRate}% Pass Rate | ${grandFailed === 0 ? '🟢 ALL PASSED' : '🔴 SOME FAILED'} |`
  );
  console.log(`⏱️ Total Execution Duration: ${durationSec}s`);
  console.log(`================================================================================\n`);

  if (grandFailed > 0) {
    console.error(`❌ Suite finished with ${grandFailed} failures.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${grandPassed} KEYWORD MASTER TESTS PASSED CLEANLY (100.0% Pass Rate).`);
    process.exit(0);
  }
}

// Execute test suite
runAllTests();
