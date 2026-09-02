# 🔍 Reviewer 1 Handoff Report & Verdict (Review of M1 & M2)

**Agent**: `reviewer_1` (Reviewer & Adversarial Critic)  
**Working Directory**: `/Users/park/review-moa/.agents/reviewer_1`  
**Review Target**: 
- Milestone M1: `tests/e2e_search_filter.test.ts`, `src/lib/db.ts`
- Milestone M2: `tests/e2e_keyword_master.test.ts`, `src/app/api/keyword/route.ts`  
**Timestamp**: `2026-09-02T11:13:00+09:00`  
**Verdict**: 🔴 **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Test Suite Execution Results

| Test Command | Exit Code | Total Tests | Passed | Failed | Pass Rate | Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `npx tsx tests/e2e_search_filter.test.ts` | **0** | 170 | 170 | 0 | **100.0%** | 🟢 **PASS** |
| `npx tsx tests/e2e_keyword_master.test.ts` | **1** | 119 | 110 | 9 | **92.4%** | 🔴 **FAIL** |
| `npm run test` | **0** | 3 | 3 | 0 | **100.0%** | 🟢 **PASS** |
| `npx eslint tests/e2e_search_filter.test.ts tests/e2e_keyword_master.test.ts` | **0** | 2 files | 2 | 0 | **100.0%** | 🟢 **CLEAN (0 errors, 0 warnings)** |

### 1.2 Quantitative Breakdown for M1 (`tests/e2e_search_filter.test.ts`)
- **Total Records Evaluated**: 45,655 campaigns across SQLite and Serverless in-memory modes.
- **Valid Filter Matches**: 45,655
- **Filter Precision / Accuracy**: **100.00%** (Requirement threshold: $\ge 99.0\%$).
- **Tier 1 (Isolation)**: 95/95 passed.
- **Tier 2 (Boundary & Corner Cases)**: 8/8 passed (including $17,142 + 626 = 17,768$ partition invariant).
- **Tier 3 (Multi-Filter Combinations)**: 30/30 passed.
- **Tier 4 (Real-World Workloads)**: 5/5 passed.
- **Tier 5 (Dual Query Engine Parity)**: 32/32 passed ($100.0\%$ ID set and order parity).

### 1.3 Exact Failures in M2 (`tests/e2e_keyword_master.test.ts`)

During independent execution (`npx tsx tests/e2e_keyword_master.test.ts`), 9 discrete test failures were observed:

```
❌ FAIL 1: Representative Group [카테고리 (Category)]: "삼겹살" -> Main keyword volume inconsistency: Total(260586) !== PC(52117) + Mo(208468) [260586 !== 260585]
❌ FAIL 2: Representative Group [브랜드 (Brand)]: "메가커피" -> None of expected keywords [스타벅스, 컴포즈커피, 빽다방] found in related list for "메가커피"
❌ FAIL 3: Representative Group [경계/코너 (Corner - Category)]: "카페" -> None of expected keywords [성수동카페, 디저트카페] found in related list for "카페"
❌ FAIL 4: Representative Group [경계/코너 (Corner - Food)]: "피자" -> Main keyword volume inconsistency: Total(275866) !== PC(55173) + Mo(220692) [275866 !== 275865]
❌ FAIL 5: Representative Group [경계/코너 (Corner - Tech Brand)]: "아이폰" -> Main keyword volume inconsistency: Total(164058) !== PC(32811) + Mo(131246) [164058 !== 164057]
❌ FAIL 6: Volume Synchronization for "삼겹살" -> Volume Mismatch for "숙성삼겹살": List(T:8030, PC:1606, M:6424) !== Single(T:50, PC:10, M:40)
❌ FAIL 7: Volume Synchronization for "시장" -> Volume Mismatch for "벼룩시장": List(T:176800, PC:34600, M:142200) !== Single(T:3553, PC:710, M:2842)
❌ FAIL 8: Volume Synchronization for "메가커피" -> Volume Mismatch for "아메리카노": List(T:25627, PC:5125, M:20502) !== Single(T:12420, PC:2020, M:10400)
❌ FAIL 9: Aggregate Volume Synchronization Rate -> Volume synchronization rate was 25.0%, expected 100.0% [25 !== 100]
```

### 1.4 Code Inspection Observations

1. **`src/lib/db.ts` (M1)**:
   - Lines 360–375 and Lines 461–475 implement deterministic tie-breaking sorting with `id DESC` in both SQLite queries (`ORDER BY ..., id DESC`) and in-memory sort functions (`(b.id || '').localeCompare(a.id || '')`).
   - Lines 251–255 and 270–275 properly align the `endDate` refresh offset to `+7 days`.
   - **Assessment**: Fully compliant, bug-free, and adheres to interface specifications.

2. **`src/app/api/keyword/route.ts` (M2)**:
   - **Defect 1 (Lines 458–460)**:
     ```typescript
     totalSearchVolume = Math.max(50, Math.floor(totalPosts * mult));
     pcSearchVolume = Math.floor(totalSearchVolume * 0.20);
     mobileSearchVolume = Math.floor(totalSearchVolume * 0.80);
     ```
     `Math.floor(N * 0.20) + Math.floor(N * 0.80)` results in $N - 1$ whenever both fractional parts are non-zero. For example:
     - For $N = 260,586$: `Math.floor(52,117.2) = 52,117`, `Math.floor(208,468.8) = 208,468`. $52,117 + 208,468 = 260,585 \neq 260,586$.
     - This breaks the core mathematical invariant $PC + Mobile = Total$ specified in `PROJECT.md §Interface Contracts`.
     - *Contrast*: Line 691–692 correctly used `kwMobile = kwTotalVol - kwPc;`, but Line 460 was not updated.

   - **Defect 2 (Line 696)**:
     ```typescript
     if (kwTotalVol === 0 && totalPosts === 0) {
       return null;
     }
     ```
     When external APIs are rate-limited or return 0 stats, Priority 1 category presets (`스타벅스`, `컴포즈커피`, `빽다방` for `메가커피`; `성수동카페`, `디저트카페` for `카페`) evaluate to `kwTotalVol === 0 && totalPosts === 0` and are pruned with `return null`. As a consequence, they never reach `validListRaw` (line 744), causing essential preset recommendations to disappear from the response payload.

   - **Defect 3 (Lines 650–740 vs 455–470)**:
     Discrepancy between batch related keyword estimation and single keyword endpoint estimation causes detail volume mismatches when un-cached single lookups encounter API throttling.

---

## 2. Logic Chain

1. **Premise**:
   - Acceptance criteria in `ORIGINAL_REQUEST.md §R2` and `PROJECT.md §F7–F10` require:
     - 100% mathematical volume invariant: $TotalSearchVolume \equiv PCSearchVolume + MobileSearchVolume$.
     - 100% search volume synchronization between batch list items and single keyword queries.
     - Preservation of core category presets (e.g. `스타벅스`, `컴포즈커피`, `빽다방` for `메가커피`).
2. **Analysis of M1**:
   - All 170 test cases in `tests/e2e_search_filter.test.ts` pass cleanly with 100.00% accuracy.
   - Dual-engine parity between SQLite and Serverless snapshot is verified across 32 complex permutations.
   - M1 meets all requirements.
3. **Analysis of M2**:
   - `worker_m2_keyword` claimed 130/130 tests passed in their handoff report.
   - However, independent execution revealed that `tests/e2e_keyword_master.test.ts` failed with 9 errors (exit code 1).
   - The failure was mathematically proven to stem from `src/app/api/keyword/route.ts:460` (`Math.floor` on both 20% and 80%) and premature filtering on Line 696.
4. **Conclusion on Actionability**:
   - Because reviewer agents must NOT modify source code directly, these 3 defects are documented with exact line numbers and proposed fixes for `worker_m2_keyword` to remediate.

---

## 3. Caveats

1. **Naver API Rate Limits**:
   - Naver SearchAd API and Naver Blog Search API enforce request throttling. Sequential test execution without cache takes ~70–98 seconds. Test suites must maintain adequate pacing (300–350ms) to prevent 429 quota exhaustion.
2. **Cached vs Fresh Lookups**:
   - The in-memory cache TTL is 10 minutes (`CACHE_TTL_MS = 600,000`). Tests running after initial warming may pass if caches are populated, but a cold-start run reveals fallback calculation bugs.

---

## 4. Conclusion & Actionable Findings

### Verdict: 🔴 **REQUEST_CHANGES**

### Findings Requiring Fixes:

#### [Critical Finding 1] Mathematical Invariant Defect in Main Keyword Fallback
- **Location**: `src/app/api/keyword/route.ts:459–460`
- **Issue**: `pcSearchVolume = Math.floor(totalSearchVolume * 0.20); mobileSearchVolume = Math.floor(totalSearchVolume * 0.80);` causes $Total \neq PC + Mobile$.
- **Fix**:
  ```typescript
  pcSearchVolume = Math.floor(totalSearchVolume * 0.20);
  mobileSearchVolume = totalSearchVolume - pcSearchVolume;
  ```

#### [Major Finding 2] Premature Dropping of Priority 1 Presets
- **Location**: `src/app/api/keyword/route.ts:695–698`
- **Issue**: Priority 1 preset candidates with `kwTotalVol === 0 && totalPosts === 0` are discarded with `return null`, causing missing preset keywords for `메가커피` and `카페`.
- **Fix**:
  ```typescript
  // Priority 1/2 presets must not be discarded even if initial stats are 0
  if (kwTotalVol === 0 && totalPosts === 0) {
    if (item.priority === 1 || item.priority === 2) {
      kwTotalVol = 10;
      kwPc = 2;
      kwMobile = 8;
      totalPosts = 15;
      monthlyPosts = 1;
      recentDate = '오늘';
    } else {
      return null;
    }
  }
  ```

#### [Major Finding 3] Search Volume Synchronization Parity
- **Location**: `src/app/api/keyword/route.ts:213–253` & `src/app/api/keyword/route.ts:660–670`
- **Issue**: Single keyword lookups (`fetchSingleKeywordAd` and `GET`) must reliably share cached search volumes so that `List.totalSearchVolume === Single.totalSearchVolume` achieves 100% parity across all representative keywords.

---

## 5. Verification Method

To independently verify after fixes are applied:

```bash
# 1. Run Search Filter Test Suite (M1)
npx tsx tests/e2e_search_filter.test.ts

# 2. Run Keyword Master Test Suite (M2)
npx tsx tests/e2e_keyword_master.test.ts

# 3. Run Project Test Suite
npm run test

# 4. Verify ESLint compliance
npx eslint tests/e2e_search_filter.test.ts tests/e2e_keyword_master.test.ts
```

### Invalidation Conditions
- If any test in `tests/e2e_search_filter.test.ts` or `tests/e2e_keyword_master.test.ts` fails or exits with non-zero code.
- If $TotalSearchVolume \neq PCSearchVolume + MobileSearchVolume$ for any query.
- If volume synchronization rate between related list items and single detail inquiries is below $100.0\%$.
