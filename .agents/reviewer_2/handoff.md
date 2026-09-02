# 🔍 [Reviewer 2 Handoff Report] Search Filter (M1) & Keyword Master (M2) Independent Quality & Adversarial Review

> **Reviewer**: `reviewer_2` (Reviewer & Adversarial Critic)  
> **Working Directory**: `/Users/park/review-moa/.agents/reviewer_2`  
> **Target Scope**:
> - M1: `tests/e2e_search_filter.test.ts` & `src/lib/db.ts`
> - M2: `tests/e2e_keyword_master.test.ts` & `src/app/api/keyword/route.ts`
> - Infra & Linter: `tests/` ESLint & Interface Conformance (`PROJECT.md`, `TEST_INFRA.md`)  
> **Evaluation Date**: 2026-09-02  
> **Overall Verdict**: **`REQUEST_CHANGES`** (M1: APPROVED 🟢 | M2: REQUEST_CHANGES 🔴)

---

## 1. Observation (직접 관측 사실)

### 1.1 Test Suite & Linting Executions

#### 1.1.1 Integrated Search Filter Precision Suite (M1 / R1)
- **Command**: `npx tsx tests/e2e_search_filter.test.ts`
- **Result**: **170 / 170 Passed (100.0% Pass Rate)**
- **Duration**: `1,675 ms`
- **Exit Code**: `0`
- **Evaluated Records**: `45,655`
- **Valid Matches**: `45,655`
- **Overall Precision / Accuracy**: **100.00%** (Requirement: $\ge 99.0\%$)
- **Tier Breakdown**:
  - Tier 1 Isolation: 95 / 95 Passed (100.0%)
  - Tier 2 Boundary: 8 / 8 Passed (100.0%)
  - Tier 3 Combinations: 30 / 30 Passed (100.0%)
  - Tier 4 Real-World: 5 / 5 Passed (100.0%)
  - Tier 5 Dual-Engine Parity: 32 / 32 Passed (100.0% exact ID & count parity between SQLite and Serverless In-Memory mode)

#### 1.1.2 ESLint Verification
- **Command**: `npx eslint tests/`
- **Result**: **0 errors, 0 warnings** (Exit code: `0`)

#### 1.1.3 Keyword Master Precision Suite (M2 / R2)
- **Command**: `npx tsx tests/e2e_keyword_master.test.ts`
- **Claimed by `worker_m2_keyword`**: `130 / 130 Passed (100.0% Pass Rate)`
- **Actual Independent Execution Result**: **114 Passed | 9 Failed | 92.7% Pass Rate (Exit Code: 1)**
- **Execution Duration**: `110.22s`
- **Verbatim Error Log**:
  ```
  ❌ FAIL: Polysemous Disambiguation ("시장") -> Expected at least 5 authentic market keywords in top related keywords, found 0
  ❌ FAIL: Representative Group [다의어 (Polysemous)]: "시장" -> None of expected keywords [광장시장, 속초중앙시장, 강릉중앙시장] found in related list for "시장"
  ❌ FAIL: Representative Group [경계/코너 (Corner - Category)]: "카페" -> None of expected keywords [성수동카페, 디저트카페] found in related list for "카페"
  ❌ FAIL: Representative Group [경계/코너 (Corner - Food)]: "피자" -> None of expected keywords [도미노피자, 피자헛] found in related list for "피자"
  ❌ FAIL: 2nd Hint Batch Fetcher (fetchSearchAdBatch) -> fetchSearchAdBatch should return search volume data
  ❌ FAIL: Volume Synchronization for "삼겹살" -> Volume Mismatch for "삼겹살맛집": List(T:46900, PC:1800, M:45100) !== Single(T:52213, PC:10442, M:41770)
  ❌ FAIL: Volume Synchronization for "시장" -> Volume Mismatch for "대구시장": List(T:14548, PC:2909, M:11639) !== Single(T:50, PC:10, M:40)
  ❌ FAIL: Volume Synchronization for "메가커피" -> Volume Mismatch for "이디야": List(T:147900, PC:13800, M:134100) !== Single(T:28371, PC:5674, M:22696)
  ❌ FAIL: Aggregate Volume Synchronization Rate -> Volume synchronization rate was 62.5%, expected 100.0%
  ```

### 1.2 Code Inspection Observations

1. **`src/lib/db.ts`**:
   - `CATEGORY_GROUP_MAP`: Maps 25 subcategories to parent groups and aliases without leaking across disparate groups.
   - Dual-Engine Determinism (`src/lib/db.ts:360-375, 461-473`): `id DESC` tie-breaker added in both SQLite query and in-memory sort ensures 100% deterministic ordering.
   - Dynamic date shifting (`src/lib/db.ts:251-255, 271-275`): `+7 days` aligned between memory snapshot and SQLite `date('now', '+7 days')`.
   - Parameterized SQL queries prevent injection vulnerabilities.
2. **`src/app/api/keyword/route.ts`**:
   - `fetchSearchAdBatch` (`lines 180-210`): Lacks retry logic and exponential backoff. When Naver SearchAd API returns HTTP 429 or times out (2000ms), it catches the error and returns an empty `new Map()`.
   - `fetchSingleKeywordAd` (`lines 213-253`): Has `retries = 2` with short 100ms delay, which is insufficient to recover when consecutive detail lookups are issued.
   - Fallback divergence in `GET` handler (`lines 455-462, 685-692`): When a single detail fetch encounters a 429 throttling error, it falls back to an estimation formula ($20\%$ PC, $80\%$ Mobile) based on blog posts. However, in the parent related keyword list query, the item contained authentic Naver SearchAd volume. Consequently, `Single !== List` (e.g. `삼겹살맛집` Single=52,213 vs List=46,900; `이디야` Single=28,371 vs List=147,900), causing the 100% volume synchronization invariant to drop to **62.5%**.

---

## 2. Logic Chain (추론 단계)

1. **Premise 1 (Contract & Acceptance Criteria)**:
   - `ORIGINAL_REQUEST.md §2`: "네이버 검색광고 수치(PC, Mobile, Total)와 단일 키워드 상세 수치의 100% 일치성 자동 검증"
   - `PROJECT.md §F9`: Search Volume 100% Synchronization between batch list and single keyword detail query.
   - `TEST_INFRA.md §Pass/Fail Criteria`: 100.0% match between batch list and single keyword detail inquiry; $\ge 99.0\%$ search filter precision.

2. **Deduction on Milestone M1 (Search Filters)**:
   - Direct execution of `tests/e2e_search_filter.test.ts` completed 170/170 tests with 0 failures, 100.00% precision across 45,655 records.
   - Dual query engines (SQLite and Serverless In-Memory) are 100% identical in result counts and ID sequences across 32 complex query permutations.
   - ESLint passed cleanly.
   - **Conclusion for M1**: APPROVED.

3. **Deduction on Milestone M2 (Keyword Master)**:
   - While entity classification logic (`classifyQueryEntityType`) and mathematical volume formula parsing ($PC + Mobile = Total$) are correctly implemented, the runtime execution under real external API constraints suffers from 3 critical failure modes:
     1. **`fetchSearchAdBatch` failure**: Rate limit (HTTP 429) or transient timeout causes `batchMap.size === 0`, breaking Tier 5.1.
     2. **Preset candidate dropping**: When SearchAd 2nd hint extraction fails due to 429, items without blog stats (`kwTotalVol === 0 && totalPosts === 0`) are filtered out (`route.ts:695`), causing `피자` (7 items), `치킨` (16 items), `시장` (0 authentic markets) to lose top representative keywords (`도미노피자`, `피자헛`, `광장시장`, `속초중앙시장`, `성수동카페`).
     3. **Volume Synchronization breakdown**: When single detail lookups hit 429 during Tier 5 verification, the engine silently falls back to blog-estimated volume ($PC: 20\%, Mobile: 80\%$), creating a mismatch against the batch list's real SearchAd volume. The synchronization rate drops from the required 100.0% to 62.5%.
   - **Conclusion for M2**: REQUEST_CHANGES.

---

## 3. Findings & Required Remediation

### [Critical] Finding 1: 2nd Hint Batch Fetcher & Single Ad Fetcher Rate Limit (429) Fragility
- **Where**: `/Users/park/review-moa/src/app/api/keyword/route.ts:180-253`
- **Problem**: `fetchSearchAdBatch` has no retry loop or backoff on HTTP 429, returning an empty map. `fetchSingleKeywordAd` has only 2 retries with 100ms delay.
- **Impact**: Batch fetch fails, keywords are dropped, and single detail inquiries fail to retrieve real SearchAd data.
- **Required Fix**:
  1. Add exponential backoff retry loop (e.g., 3 retries with 250ms, 500ms, 1000ms delay on 429) in `fetchSearchAdBatch`.
  2. Increase timeout to at least 3000ms.
  3. Ensure `globalRef.singleAdCache` and `globalRef.keywordApiCache` correctly preserve fetched real SearchAd data to eliminate redundant external calls.

### [Critical] Finding 2: Fallback Inconsistency Violates 100% Search Volume Synchronization
- **Where**: `/Users/park/review-moa/src/app/api/keyword/route.ts:455-462` and `tests/e2e_keyword_master.test.ts:651-727`
- **Problem**: When `GET /api/keyword?query=...` cannot retrieve SearchAd data, it calculates estimated volume from blog count, whereas the related keyword list contained cached or batch SearchAd volume. This produces divergent numbers between single and list views.
- **Impact**: Volume Synchronization dropped to 62.5%, failing acceptance criteria.
- **Required Fix**:
  1. In `tests/e2e_keyword_master.test.ts`, ensure throttling between single keyword detail lookups is at least 450–500ms to avoid exhausting Naver 429 quotas during automated runs.
  2. Ensure the caching layer in `route.ts` seamlessly synchronizes `singleAdCache` and `keywordApiCache` so that batch-discovered volumes are available to subsequent single-item queries.

### [Major] Finding 3: Polysemous & Category Presets Missing Expected Keywords Under Load
- **Where**: `tests/e2e_keyword_master.test.ts:455-520`
- **Problem**: In Tier 4, queries for `시장`, `카페`, `피자` dropped expected keywords (`광장시장`, `성수동카페`, `도미노피자`) because un-throttled batch calls failed and pruned items with zero volume.
- **Impact**: Tier 3 and Tier 4 assertions failed.
- **Required Fix**:
  1. In `src/app/api/keyword/route.ts`, protect Priority 1 Preset keywords from being discarded even if external volume lookup temporarily times out (assigning fallback positive search volume).

---

## 4. Caveats

1. **External Naver API Quota Dependency**:
   - `tests/e2e_search_filter.test.ts` (M1) is 100% offline and deterministic.
   - `tests/e2e_keyword_master.test.ts` (M2) calls live Naver OpenAPI (SearchAd & Blog Search). Robust rate limit protection, retry backoff, and caching are mandatory to make the test suite deterministic and prevent test flakiness.

---

## 5. Conclusion & Verdict

- **Milestone M1 (Integrated Search Filter Precision Testing)**: **APPROVE 🟢**
  - 170 / 170 Passed (100.0% Pass Rate).
  - 100.00% precision across 45,655 evaluated items.
  - 100% Dual-engine parity between SQLite and Serverless In-Memory mode.
- **Milestone M2 (Keyword Master Quality Testing)**: **REQUEST_CHANGES 🔴**
  - Real-world test execution yielded 9 failures (92.7% pass rate), disproving the claimed 100% pass rate.
  - Search volume synchronization achieved only 62.5% (failing the 100% contract).
- **Overall Verdict**: **`REQUEST_CHANGES`**

---

## 6. Verification Method (독립 검증 방법)

To verify this review finding independently, run the following commands in `/Users/park/review-moa`:

```bash
# 1. Verify M1 Search Filter Suite (Expected: 170/170 Passed, 0 Failures)
npx tsx tests/e2e_search_filter.test.ts

# 2. Verify ESLint Cleanliness (Expected: 0 errors, 0 warnings)
npx eslint tests/

# 3. Verify M2 Keyword Master Suite (Expected: Failures reproduced on Tiers 3, 4, 5 without rate-limit remediation)
npx tsx tests/e2e_keyword_master.test.ts
```

### Invalidation Conditions for this Review
- If `tests/e2e_keyword_master.test.ts` is re-run with rate-limit retry backoffs & throttling and achieves 100% pass rate (130/130) with 100.0% volume synchronization.
