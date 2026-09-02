# Project: review-moa Automated Precision Testing & Verification

## Architecture
- **Web Framework**: Next.js 16.2.12 (App Router), React 19.2.4, TypeScript 5, Node.js 24
- **Database & Data Layer**: SQLite 3 (`data/review-moa.db`, 17,768 seeded active campaigns) + Serverless In-Memory snapshot (`data/campaigns.json`) via `src/lib/db.ts:queryCampaigns`
- **Search System Entry Points**:
  - API: `src/app/api/campaigns/route.ts` (GET handler with query parameters)
  - Core Query Engine: `src/lib/db.ts` (`queryCampaigns`, `CATEGORY_GROUP_MAP`, `insertOrUpdateCampaigns`)
  - Frontend UI: `src/app/page.tsx` (Filter dropdowns, search input, infinite scroll, 60s auto-sync)
- **Keyword Master Entry Points**:
  - API: `src/app/api/keyword/route.ts` (Entity classification, 9 category presets, Naver Search Ad API batch & single fetchers, Naver Autocomplete, Naver Blog Search, 2nd hint collection)
  - UI: `src/app/page.tsx` (Keyword Master modal & analytics)
- **Testing Infrastructure**: `tsx` test runners, standalone TypeScript automated test suites, Node.js native assert, `npm run test`

## Feature Inventory
Every feature from the survey and requirements is assigned to a milestone:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Recruitment Type Filter (`type`) | Verification of `all`, `visit` (17,142 items), `delivery` (626 items) filter accuracy and data partitioning | M1 | ORIGINAL_REQUEST §R1 |
| F2 | Category 25-Type Filter (`category`) | Verification of all 25 subcategories + `etc` + 4 major groups mapped through `CATEGORY_GROUP_MAP` | M1 | ORIGINAL_REQUEST §R1 |
| F3 | Platform Filter (`platform`) | Verification of `all`, `blog`, `clip`, `blog+clip`, `instagram`, `youtube`, `etc` matching rules | M1 | ORIGINAL_REQUEST §R1 |
| F4 | Region Sido & Sigungu Filter (`location`) | Verification of 17 광역시도 and 220+ 시군구 hierarchy and token stemming (`구|군|시|도`) | M1 | ORIGINAL_REQUEST §R1 |
| F5 | Multi-Filter Permutations & Data Loss Guard | Verification of multi-filter combinations (Type x Category x Platform x Region x Search) with >=99% match rate | M1 | ORIGINAL_REQUEST §R1 |
| F6 | Dual Query Engine Parity | Verification of 100% equivalence between SQLite SQL output and Serverless In-Memory array filter output | M1 | ORIGINAL_REQUEST §R1 |
| F7 | Keyword Master Entity & Preset Engine | Verification of 5 entity types and 9 category presets for representative keywords (시장, 삼겹살, 메가커피, 제주도, 복합어 등) | M2 | ORIGINAL_REQUEST §R2 |
| F8 | Keyword Ranking & Priority Integrity | Verification of 3-tier priority ordering and total volume sorting without noise contamination | M2 | ORIGINAL_REQUEST §R2 |
| F9 | Search Volume 100% Synchronization | Verification of PC, Mobile, and Total search volume parity between batch list and single keyword detail query | M2 | ORIGINAL_REQUEST §R2 |
| F10 | 2nd Hint Collection Engine | Verification of `fetchSearchAdBatch` and `fetchSingleKeywordAd` 2nd hint extraction and rate limit protection | M2 | ORIGINAL_REQUEST §R2 |
| F11 | Quantitative Test Matrix & Metrics Report | Generation of comprehensive quantitative verification tables with Pass Rate, Accuracy %, and Edge Case error rates | M3 | ORIGINAL_REQUEST §R3 |
| F12 | Troubleshooting Documentation | Detailed documentation of identified exceptions and edge cases following strict `TROUBLESHOOTING.md` 4-part guidelines | M3 | ORIGINAL_REQUEST §R3 |
| F13 | Full E2E Test Suite & Adversarial Hardening | End-to-end execution of Tier 1-5 test suites ensuring 100% pass rate and zero regressions | M4 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Integrated Search Filter Precision Testing | Automated test suite verifying single and multi-filter combinations (F1-F6) with 99%+ accuracy and data integrity | none | PLANNED |
| 2 | M2: Keyword Master Accuracy & Volume Sync Testing | Automated test suite verifying keyword extraction, ranking, 100% volume sync (F7-F10) for representative keyword sets | none | PLANNED |
| 3 | M3: Quantitative Report & TROUBLESHOOTING.md Documentation | Formal quantitative verification report and troubleshooting documentation (F11-F12) complying with project schema | M1, M2 | PLANNED |
| 4 | M4: Final E2E Suite Validation & Adversarial Hardening | Full execution of Tiers 1-5 test suites, forensic audit verification, and final delivery | M1, M2, M3 | PLANNED |

## Interface Contracts
### Search Engine Interface (`src/lib/db.ts:queryCampaigns`)
- **Input**: `FilterOptions = { search?: string, platform?: string, category?: string, location?: string, targetSite?: string, sortBy?: 'latest' | 'endDate' | 'popular', type?: 'all' | 'visit' | 'delivery' }`
- **Output**: `Promise<Campaign[]>` (Array of campaigns, capped at 300 items)
- **Invariants**:
  - `endDate >= todayStr` for active campaigns
  - `type='visit'` must have non-empty location and exclude delivery tokens
  - `type='delivery'` includes empty location or delivery tokens
  - `category` matches any mapped alias in `CATEGORY_GROUP_MAP[category]`
  - `platform='blog'` matches `'blog'` or `'blog+clip'`

### Keyword Master Engine Interface (`src/app/api/keyword/route.ts`)
- **Input**: HTTP GET `/api/keyword?query=<string>`
- **Output**: JSON payload:
  ```typescript
  {
    success: boolean,
    data: {
      mainKeyword: string,
      entityType: 'LOCATION' | 'VENUE' | 'SEASONAL_EVENT' | 'BRAND_PRODUCT' | 'GENERAL_CATEGORY',
      totalSearchVolume: number,
      pcSearchVolume: number,
      mobileSearchVolume: number,
      totalPosts: number,
      monthlyPosts: number,
      recentPostDate: string,
      competitionRatio: number,
      grade: 'GOLD' | 'NORMAL' | 'HARD',
      relatedKeywords: Array<{
        keyword: string,
        totalSearchVolume: number,
        pcSearchVolume: number,
        mobileSearchVolume: number,
        totalPosts: number,
        monthlyPosts: number,
        competitionRatio: number,
        grade: 'GOLD' | 'NORMAL' | 'HARD',
        isRealSearchAdData?: boolean,
        isAdFiltered?: boolean
      }>,
      blogList: Array<any>
    }
  }
  ```
- **Invariants & Anti-Regression Directives**:
  - `totalSearchVolume === pcSearchVolume + mobileSearchVolume`
  - Related keyword volumes must exactly match single keyword detail queries
  - **No Dummy / Fallback Data**: `kwTotalVol = 10, totalPosts = 25, monthlyPosts = 1` or any fake fallback values are strictly forbidden. Zero-data keywords must be filtered out (`return null`).
  - **Strict Search Volume Descending Order**: `relatedKeywords` MUST ALWAYS be sorted strictly by `totalSearchVolume` descending (`b.totalSearchVolume - a.totalSearchVolume`), guaranteeing major search keywords (e.g. `김밥` 25만건, `떡볶이` 50만건) rank at the top.
  - **EC2 Snapshot & Fail-Safe Protection**: SQLite DB auto-seeding falls back to in-memory `data/campaigns.json` snapshot when native C++ modules fail, and `campaigns.json` MUST NEVER be overwritten with < 1000 records.

## Code Layout
- Test Scripts: `tests/` and `src/lib/`
  - `tests/e2e_search_filter.test.ts`: Search filter combination precision test suite
  - `tests/e2e_keyword_master.test.ts`: Keyword Master accuracy, ranking, and volume sync test suite
  - `tests/e2e_crawl_and_sync.test.ts`: Live crawler & auto-sync data integrity suite
  - `tests/adversarial_challenge.test.ts`: Adversarial stress test suite
- Reports:
  - `FINAL_TEST_REPORT.md` (or `REPORTS.md`): Quantitative report with tables, pass rates, and metrics
  - `TROUBLESHOOTING.md`: Documented exceptions adhering to the 4-section standard

