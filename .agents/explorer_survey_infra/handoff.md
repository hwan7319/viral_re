# 📋 Testing & Infrastructure Survey Report (Handoff)

> **Working Directory**: `/Users/park/review-moa`  
> **Agent Working Folder**: `/Users/park/review-moa/.agents/explorer_survey_infra`  
> **Survey Timestamp**: 2026-09-02T10:58:30+09:00  

---

## 1. Observation

Direct observations from examining the codebase, configuration files, database, APIs, and runtime execution:

### 1.1 Technology Stack & Environment
- **Node.js Runtime**: `v24.6.0` (compatible with Node 20+)
- **Package Manager**: `npm v11.5.1` (`package-lock.json` format version 3)
- **Framework**: `Next.js 16.2.12` (Next.js App Router architecture, TypeScript, React Server/Client Components)
- **UI & Frontend**: `React 19.2.4`, `react-dom 19.2.4`
- **Compiler / Runner**: `TypeScript 5.x`, `tsx v4.23.1` (TypeScript executing engine for Node.js)
- **Scraping & HTTP**: `axios 1.19.0`, `cheerio 1.2.0`, Node.js built-in `https` agent with `rejectUnauthorized: false`
- **Database**:
  - SQLite 3 (`sqlite3: ^6.0.1`, `sqlite: ^5.1.1`, `@types/sqlite3: ^3.1.11`)
  - Primary Local DB File: `/Users/park/review-moa/data/review-moa.db` (Contains **17,768** campaign records)
  - Backup / Serverless Rehydration Snapshot: `/Users/park/review-moa/data/campaigns.json` (Contains **17,768** campaign records)
- **Linting**: `ESLint 9.x` with `eslint-config-next: 16.2.12` (`eslint.config.mjs`)

### 1.2 Project Scripts (`package.json`)
```json
{
  "scripts": {
    "dev": "next dev",
    "test": "npx tsx src/lib/audit_troubleshoot_all.ts",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "crawl": "tsx src/scripts/crawler.ts"
  }
}
```

### 1.3 Testing Infrastructure & Execution Model
- **Test Runner**:
  - No heavyweight test runners (Jest, Vitest, Mocha, Playwright) are declared in `package.json`.
  - Testing is executed natively via `tsx` scripts (`npx tsx <script_path>.ts`).
  - Standard project test execution command: `npm run test` (which triggers `npx tsx src/lib/audit_troubleshoot_all.ts`).
  - Node.js native test features (`node:test`, `node:assert`) and standalone assertion scripts are 100% supported by the runtime (`tsx v4.23.1` on `Node v24.6.0`).
- **Existing Verification & Audit Suites**:
  1. `src/lib/audit_troubleshoot_all.ts`: 17-site anti-regression audit verifying title-benefit duplication, meta-text contamination, broken text, and platform classification.
  2. `src/lib/deep_system_audit.ts`: Deep validation checking live data authenticity, benefit correctness, badge matching, and mission purity.
  3. `src/lib/audit_all_sites.ts`: Multi-platform live scraping audit.
  4. `audit_bulk_100.ts`: 100+ sample campaign database synchronization and accuracy reconciliation script.
  5. `src/scripts/compare_lists.ts`: Multi-platform data reconciliation comparing raw scraped data with SQLite DB entries.

### 1.4 Database & Dual Execution Modes (`src/lib/db.ts`)
- **Database Schema**:
  - `campaigns`: `id`, `title`, `description`, `platform`, `category`, `location`, `campaignUrl`, `imageUrl`, `targetSite`, `limitCount`, `applyCount`, `startDate`, `endDate`, `createdAt`, `updatedAt`, `searchKeywords`, `mission`.
  - `crawling_logs`: `id`, `targetSite`, `status`, `collectedCount`, `errorMessage`, `executedAt`.
  - `users`: `id`, `name`, `email`, `avatar`, `provider`, `createdAt`, `updatedAt`.
  - `user_bookmarks`: `userId`, `campaignId`, `createdAt`.
  - `search_logs`: `id`, `keyword`, `searchedAt`.
  - Indexes: `idx_campaigns_search`, `idx_campaigns_filters`, `idx_campaigns_end_date`, `idx_user_bookmarks_user`, `idx_search_logs_keyword`.
- **Dual Execution Behavior**:
  1. **Local Development (Default)**: Directly queries `/Users/park/review-moa/data/review-moa.db` via `sqlite3`. On `insertOrUpdateCampaigns`, automatically syncs/backs up to `data/campaigns.json`.
  2. **Serverless (Vercel)** (`process.env.VERCEL` is set): Operates in-memory (`globalRef.memoryCampaigns`) rehydrating from `data/campaigns.json` with an automatic `endDate` shift mechanism (`offsetDays = 7 + (hash % 7)`).
- **Recruitment Type Classification (`type`)**:
  - `visit` (방문형): `location IS NOT NULL AND location != '' AND location NOT LIKE '%배송%' AND location NOT LIKE '%전국%' AND location NOT LIKE '%재택%' AND location NOT LIKE '%택배%' AND location NOT LIKE '%온라인%'`
  - `delivery` (배송형): `location IS NULL OR location = '' OR location LIKE '%배송%' OR location LIKE '%전국%' OR location LIKE '%재택%' OR location LIKE '%택배%' OR location LIKE '%온라인%'`
- **Category Hierarchy & Group Mapping (`CATEGORY_GROUP_MAP`)**:
  - 25+ categories categorized into 6 major sectors (Food, Beauty/Health, Travel/Stay, Culture, Fashion, Life/Digital/Pet/Book/Hobby/Etc).
  - Defined in `src/lib/db.ts:1-41` and UI mapped in `src/app/page.tsx:958-1051`.
- **Platform Classification (`detectPlatform`)**:
  - `blog` (네이버 블로그), `clip` (네이버 클립), `blog+clip` (블로그+클립 복합), `instagram` (인스타그램/릴스), `youtube` (유튜브/쇼츠), `etc` (기타).
- **Location Structure (`LOCATIONS_MAP`)**:
  - 17 광역시도 (`서울`, `경기`, `인천`, `부산`, `대구`, `대전`, `광주`, `울산`, `강원`, `충북`, `충남`, `전북`, `전남`, `경북`, `경남`, `제주`, `세종`).
  - 250+ detailed 시군구 mappings defined in `src/app/page.tsx:1993-2011`.

### 1.5 Keyword Master Engine (`src/app/api/keyword/route.ts`)
- **API Credentials & Endpoints**:
  - Naver Search API: `https://openapi.naver.com/v1/search/blog.json` (`NAVER_CLIENT_ID` & `NAVER_CLIENT_SECRET` in `.env.local` with fallback defaults in code).
  - Naver SearchAd API: `https://api.searchad.naver.com/keywordstool` with HMAC-SHA256 signature generator (`generateSearchAdSignature`).
  - Naver Auto-Complete API: `https://ac.search.naver.com/nx/ac?q_enc=UTF-8&st=100&r_format=json&q=...`.
- **Engine Features**:
  1. 5 Entity Classifications: `LOCATION`, `VENUE`, `SEASONAL_EVENT`, `BRAND_PRODUCT`, `GENERAL_CATEGORY`.
  2. Category presets for representative terms (`메가커피`, `커피`, `제주도`, `치킨`, `삼겹살`, `피자`, `카페`, `영양제`, `시장`).
  3. Batch search ad fetcher (`fetchSearchAdBatch`) with 5-keyword chunks and single search ad fetcher (`fetchSingleKeywordAd`).
  4. Mathematical competition ratio: $\text{Competition Ratio} = \frac{\text{Total Posts}}{\text{Total Search Volume}}$.
  5. 10-minute global in-memory LRU cache (`CACHE_TTL_MS = 10 * 60 * 1000`).

### 1.6 Existing Documentation Guidelines & TROUBLESHOOTING.md Schema
- **File Location**: `/Users/park/review-moa/TROUBLESHOOTING.md`
- **Mandatory Agent Rule (`AGENTS.md`)**:
  - All modifications must inspect `TROUBLESHOOTING.md` before making code changes.
  - Hardcoded caps (`slice(0, 5)` etc.) or unconditional dummy values (`val = 10` etc.) are strictly forbidden.
- **Required Document Schema**:
  ```markdown
  # 🛠️ 트러블슈팅 및 장애 재발 방지 기록 (Troubleshooting Log)

  ---

  ## 📌 이슈 [YYYY-MM-DD]: [이슈 제목]

  ### 1. 현상 (Symptom)
  * [구체적 장애 현상 및 영향 범위]

  ---

  ### 2. 원인 분석 (Root Cause Analysis)
  1. **[원인 항목 1]**
     * [구체적 발생 메커니즘]
  2. **[원인 항목 2]**
     * ...

  ---

  ### 3. 영구 수정 및 해결 조치 (Permanent Solution)
  1. **[해결 조치 1 (`수정 파일 경로`)]**
     * [해결 세부 내용]
  2. **결과 검증 (Post-Fix Results)**
     * **[검증 대상]**: [검증 수치 / 상태] 🟢

  ---

  ### 4. 재발 방지 가이드라인 (Preventive Directive)
  * [재발 방지 지침 및 체크리스트]
  ```

---

## 2. Logic Chain

1. **Test Infrastructure Selection**:
   - *Observation*: `package.json` defines `"test": "npx tsx src/lib/audit_troubleshoot_all.ts"`. Node 24 and `tsx v4.23.1` execute TypeScript files directly without a separate build step.
   - *Inference*: Automated test scripts for R1 (search filter matrix) and R2 (keyword master accuracy) should be authored in TypeScript and executed via `npx tsx <test_script>.ts` (or imported into custom test suites).

2. **Database & Service Execution**:
   - *Observation*: `src/lib/db.ts` exposes `getDB()`, `queryCampaigns()`, and `insertOrUpdateCampaigns()`. `data/review-moa.db` holds 17,768 seeded campaign rows.
   - *Inference*: Test scripts can invoke `queryCampaigns()` directly in-process or spin up the Next.js dev server (`npm run dev`) and test via HTTP GET requests against `/api/campaigns` and `/api/keyword`.

3. **Keyword Verification Accuracy**:
   - *Observation*: Testing `시장`, `삼겹살`, `메가커피`, `제주도` via `src/app/api/keyword/route.ts` yielded 100% accurate PC/Mobile search volumes with zero 400/429 errors and exact match against single-query volumes (e.g., `맛찬들` at 35,760 in both batch and single queries).
   - *Inference*: The keyword engine can be rigorously tested across sample groups with quantitative assertion criteria ($100\%$ PC/Mobile/Total synchronization and 0 dummy values).

4. **Search Filter Matrix Coverage**:
   - *Observation*: `queryCampaigns` supports all 3 recruitment types (`all`, `visit`, `delivery`), 25+ categories via `CATEGORY_GROUP_MAP`, 6 platform types, 17 Sido, and 250+ Sigungu.
   - *Inference*: An exhaustive matrix test can iterate over single-filter and multi-filter combinations, verifying data non-emptiness, category alignment, and location matching.

5. **Reporting & Troubleshooting Standards**:
   - *Observation*: `TROUBLESHOOTING.md` and `SYSTEM_ARCHITECTURE_AND_TROUBLESHOOTING.md` require specific 4-section structured markdown with qualitative and quantitative proof.
   - *Inference*: Any bugs or edge cases found during testing must be added to `TROUBLESHOOTING.md` adhering exactly to the 4-section template.

---

## 3. Caveats

1. **Network Dependency for Live APIs**:
   - External calls to `api.searchad.naver.com` and `openapi.naver.com` require network connectivity and may experience brief rate limits if queried with excessive concurrency (>20 requests/sec). The engine has built-in retry and backoff, but batch test scripts should respect a 20-50ms stagger.
2. **Serverless vs Local Mode Differences**:
   - In local mode, SQLite queries execute `SELECT * FROM campaigns WHERE endDate >= todayStr`. In serverless mode (`process.env.VERCEL`), an in-memory JS filter is applied over `globalRef.memoryCampaigns`. Both modes must be verified to ensure parity.
3. **No Caveats on Local Database Availability**:
   - Both `/Users/park/review-moa/data/review-moa.db` and `/Users/park/review-moa/data/campaigns.json` are present, populated with 17,768 records, and fully functional.

---

## 4. Conclusion

- The testing and runtime infrastructure is fully operational on **Node.js 24 + TypeScript 5 + tsx 4.23.1**.
- All data fixtures (17,768 records), database instances (`review-moa.db`), and API keys (Naver Search & SearchAd) are in place and verified active.
- Automated testing for R1 (Integration Search Test) and R2 (Keyword Master Quality Test) can be built as standalone TypeScript test harnesses executed with `npx tsx <path>` or integrated into `npm run test`.
- The reporting format for `TROUBLESHOOTING.md` and quantitative test tables is fully mapped out and ready for implementation.

---

## 5. Verification Method

To independently verify all findings in this survey report, execute the following commands:

```bash
# 1. Verify Node and tsx runtime versions
node -v
npx tsx --version

# 2. Verify SQLite database and record count
npx tsx -e "import { getDB } from './src/lib/db'; getDB().then(db => db.get('SELECT count(*) as count FROM campaigns')).then(console.log);"

# 3. Run existing anti-regression test suite
npm run test

# 4. Verify Keyword API directly with representative queries
npx tsx -e "
import { GET } from './src/app/api/keyword/route';
async function run() {
  const res = await GET(new Request('http://localhost:3000/api/keyword?query=삼겹살'));
  const data = await res.json();
  console.log('Keyword success:', data.success, 'TotalVol:', data.data?.totalSearchVolume, 'Related count:', data.data?.relatedKeywords?.length);
}
run();
"

# 5. Verify Search Filter API with combinations
npx tsx -e "
import { queryCampaigns } from './src/lib/db';
async function run() {
  const res = await queryCampaigns({ type: 'visit', platform: 'blog', category: 'food-korean', location: '서울 강남구' });
  console.log('Filter query match count:', res.length, 'Sample:', res[0]?.title);
}
run();
"
```
