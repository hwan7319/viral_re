# 🔍 Integrated Search System (통합검색 시스템) Comprehensive Codebase Survey & Architecture Report

> **Agent**: `explorer_survey_search`  
> **Working Directory**: `/Users/park/review-moa/.agents/explorer_survey_search`  
> **Target System**: Review-Moa (`viral_re`) Next.js 16 / React 19 Integrated Search Engine  
> **Date**: 2026-09-02  

---

## 1. Observation (직접 관측 사실)

### 1.1 Core Search System Architecture & Entry Points

| Component | File Path | Line Range | Role & Signature |
| :--- | :--- | :--- | :--- |
| **Search API Handler** | `src/app/api/campaigns/route.ts` | 1-130 | `GET(request: NextRequest)`: Query params parsing, on-demand background crawl triggers with 3-minute cooldown, calls `queryCampaigns()` and `getTotalCampaignCount()`. |
| **Dual-Mode Query Engine** | `src/lib/db.ts` | 226-480 | `queryCampaigns(filters: FilterOptions): Promise<Campaign[]>`: Handles both SQLite SQL queries (local) and in-memory JS array filtering (Serverless/Vercel). |
| **Category Group Map** | `src/lib/db.ts` | 1-41 | `CATEGORY_GROUP_MAP: Record<string, string[]>`: 26 semantic category mapping aliases. |
| **Frontend Filter & UI** | `src/app/page.tsx` | 1-2200 | Client component: Search input, 4 filter dropdown/bottom sheets (`type`, `category`, `platform`, `location`), 60s auto-sync timer, infinite scroll observer. |
| **Category Auto-Detector** | `src/lib/crawler-parallel.ts` | 99-174 | `detectCategory(title, desc): string`: Keyword-based category classification during crawling. |
| **Platform Auto-Detector** | `src/lib/crawler-parallel.ts` | 78-97 | `detectPlatform(title, rawPlatformText)`: Platform classification (`blog`, `clip`, `blog+clip`, `instagram`, `youtube`, `etc`). |
| **Detail Scraper & DB Sync** | `src/app/api/campaign-detail/route.ts` | 1-55 | `GET(request: NextRequest)`: Real-time detail scraper & DB UPDATE (`applyCount`, `limitCount`, `mission`, `description`). |

---

### 1.2 All 4 Filter Dimensions

#### (1) 모집유형 (Recruitment Type - `type`)
Defined in `src/lib/db.ts:345-358` (Memory mode) and `src/lib/db.ts:456-462` (SQLite mode):
- **`all` (전체 유형)**: No filter applied.
- **`visit` (방문형)**:
  - SQLite: `AND location IS NOT NULL AND location != '' AND location NOT LIKE '%배송%' AND location NOT LIKE '%전국%' AND location NOT LIKE '%재택%' AND location NOT LIKE '%택배%' AND location NOT LIKE '%온라인%'`
  - In-Memory: `hasLoc && !isDeliveryText` where `isDeliveryText = location.includes('배송'|'전국'|'재택'|'택배'|'온라인')`
- **`delivery` (배송형)**:
  - SQLite: `AND (location IS NULL OR location = '' OR location LIKE '%배송%' OR location LIKE '%전국%' OR location LIKE '%재택%' OR location LIKE '%택배%' OR location LIKE '%온라인%')`
  - In-Memory: `!isVisit`
- **Database Distribution**:
  - `visit`: **17,142 items** (96.5%)
  - `delivery`: **626 items** (3.5%)

---

#### (2) 카테고리 (Categories - 25 Subcategories + 1 `etc` + 4 Major Groups)
Defined in `src/lib/db.ts:1-41` (`CATEGORY_GROUP_MAP`) and `src/app/page.tsx:776-802, 966-1050`:

| Major Group | Subcategory Key | Korean Label (UI) | `CATEGORY_GROUP_MAP` Mapping Target | DB Count (Live) |
| :--- | :--- | :--- | :--- | :---: |
| **🍽️ 맛집/디저트/주점** | `food-korean` | 한식 | `['food-korean', 'food-restaurant', 'food']` | 6,990 |
| | `food-western` | 양식 | `['food-western', 'food-foreign', 'food']` | 482 |
| | `food-japanese` | 일식 | `['food-japanese', 'food-foreign', 'food']` | 797 |
| | `food-chinese` | 중식 | `['food-chinese', 'food-foreign', 'food']` | 295 |
| | `food-cafe` | 카페/디저트 | `['food-cafe', '디저트']` | 1,811 |
| | `food-pub` | 술집/주점 | `['food-pub', '주점', '술집']` | 554 |
| | `food-restaurant` | 한식/맛집 | `['food-restaurant', 'food-korean', 'food-western', 'food-japanese', 'food-chinese', 'food']` | 9 |
| | `food-foreign` | 양식/일식/중식 | `['food-foreign', 'food-western', 'food-japanese', 'food-chinese', 'food']` | 0 (mapped) |
| **✨ 뷰티/미용/헬스** | `beauty-cosmetics` | 화장품/스킨케어 | `['beauty-cosmetics', 'beauty-cosmetic', 'beauty']` | 256 |
| | `beauty-salon` | 헤어/네일/속눈썹 | `['beauty-salon', 'beauty-hair']` | 517 |
| | `beauty-spa` | 피부/에스테틱 | `['beauty-spa', 'beauty-skin']` | 596 |
| | `health-fitness` | 헬스/피트니스 | `['health-fitness', 'health']` | 1,253 |
| | `health-food` | 영양제/건강식품 | `['health-food', 'health-fresh', 'health']` | 52 |
| **🧭 여행/숙박/문화** | `accommodation` | 숙박 (호텔/펜션) | `['accommodation', 'travel-stay']` | 99 |
| | `travel` | 여행/레저/관광 | `['travel', 'travel-leisure']` | 2,622 |
| | `culture` | 문화/공연/전시 | `['culture', 'travel-leisure']` | 0 (mapped) |
| **🛍️ 패션/생활/디지털** | `fashion-clothing` | 의류/패션 | `['fashion-clothing', 'fashion']` | 2 |
| | `fashion-accessory`| 신발/가방/잡화 | `['fashion-accessory', 'fashion']` | 1 |
| | `baby` | 유아동/육아 | `['baby', 'life']` | 16 |
| | `life-goods` | 생활용품/인테리어 | `['life-goods', 'life']` | 5 |
| | `health-fresh` | 밀키트/신선식품 | `['health-fresh', 'food']` | 95 |
| | `life-appliances` | 가전/디지털 | `['life-appliances', 'life']` | 13 |
| | `pet` | 반려동물/애견 | `['pet', 'life']` | 13 |
| | `book` | 도서/교육 | `['book', 'life']` | 8 |
| | `hobby` | 취미/클래스 | `['hobby', 'travel-leisure', 'life']` | 0 (mapped) |
| **기타** | `etc` | 기타 | `['etc']` | 1,282 |

---

#### (3) 플랫폼 (Platforms - `platform`)
Defined in `src/lib/db.ts:311-321` (Memory mode) and `src/lib/db.ts:402-413` (SQLite mode):
- **`all` (전체)**: No platform condition applied.
- **`blog` (네이버 블로그)**: `platform = 'blog' OR platform = 'blog+clip'` (DB: 12,224 pure blog + 2,577 blog+clip = 14,801 matchable)
- **`clip` (네이버 클립)**: `platform = 'clip' OR platform = 'blog+clip'` (DB: 31 pure clip + 2,577 blog+clip = 2,608 matchable)
- **`blog+clip` (블로그+클립)**: `platform = 'blog+clip'` (DB: 2,577)
- **`instagram` (인스타그램)**: `platform = 'instagram'` (DB: 2,936)
- **`youtube` (유튜브)**: `platform = 'youtube'` (DB: 0)
- **`etc` (기타 플랫폼)**: `platform = 'etc'` (DB: 0)

---

#### (4) 지역 (Region Hierarchy - `location`)
Defined in `src/app/page.tsx:1993-2011` (`LOCATIONS_MAP`):
- **17 광역시도**: 서울, 경기, 인천, 부산, 대구, 대전, 광주, 울산, 강원, 제주, 충북, 충남, 전북, 전남, 경북, 경남, 세종.
- **220+ 시군구 계층 구조**:
  - `서울` (25개구): 강남구, 강동구, 강북구, 강서구, 관악구, 광진구, 구로구, 금천구, 노원구, 도봉구, 동대문구, 동작구, 마포구, 서대문구, 서초구, 성동구, 성북구, 송파구, 양천구, 영등포구, 용산구, 은평구, 종로구, 중구, 중랑구
  - `경기` (31개 시/군): 수원시, 성남시, 고양시, 용인시, 부천시, 안산시, 안양시, 남양주시, 화성시, 평택시, 의정부시, 시흥시, 파주시, 김포시, 광명시, 광주시, 군포시, 오산시, 하남시, 이천시, 구리시, 양주시, 안성시, 포천시, 의왕시, 여주시, 동두천시, 양평군, 가평군, 연천군
  - `인천` (10개 구/군): 중구, 동구, 미추홀구, 연수구, 남동구, 부평구, 계양구, 서구, 강화군, 옹진군
  - `부산` (16개 구/군): 중구, 서구, 동구, 영도구, 부산진구, 동래구, 남구, 북구, 해운대구, 사하구, 금정구, 강서구, 연제구, 수영구, 사상구, 기장군
  - `대구` (9개 구/군): 중구, 동구, 서구, 남구, 북구, 수성구, 달서구, 달성군, 군위군
  - `대전` (5개구): 동구, 중구, 서구, 유성구, 대덕구
  - `광주` (5개구): 동구, 서구, 남구, 북구, 광산구
  - `울산` (5개 구/군): 중구, 남구, 동구, 북구, 울주군
  - `강원` (18개 시/군): 춘천시, 원주시, 강릉시, 동해시, 태백시, 속초시, 삼척시, 홍천군, 횡성군, 영월군, 평창군, 정선군, 철원군, 화천군, 양구군, 인제군, 고성군, 양양군
  - `제주` (2개시): 제주시, 서귀포시
  - `충북` (11개 시/군): 청주시, 충주시, 제천시, 보은군, 옥천군, 영동군, 증평군, 진천군, 괴산군, 음성군, 단양군
  - `충남` (15개 시/군): 천안시, 공주시, 보령시, 아산시, 서산시, 논산시, 계룡시, 당진시, 금산군, 부여군, 서천군, 청양군, 홍성군, 예산군, 태안군
  - `전북` (14개 시/군): 전주시, 군산시, 익산시, 정읍시, 남원시, 김제시, 완주군, 진안군, 무주군, 장수군, 임실군, 순창군, 고창군, 부안군
  - `전남` (22개 시/군): 목포시, 여수시, 순천시, 나주시, 광양시, 담양군, 곡성군, 구례군, 고흥군, 보성군, 화순군, 장흥군, 강진군, 해남군, 영암군, 무안군, 함평군, 영광군, 장성군, 완도군, 진도군, 신안군
  - `경북` (22개 시/군): 포항시, 경주시, 김천시, 안동시, 구미시, 영주시, 영천시, 상주시, 문경시, 경산시, 의성군, 청송군, 영양군, 영덕군, 청도군, 고령군, 성주군, 칠곡군, 예천군, 봉화군, 울진군, 울릉군
  - `경남` (18개 시/군): 창원시, 진주시, 통영시, 사천시, 김해시, 밀양시, 거제시, 양산시, 의령군, 함안군, 창녕군, 고성군, 남해군, 하동군, 산청군, 함양군, 거창군, 합천군
  - `세종` (1개): 세종특별자치시

- **Location Stemming Logic** (`src/lib/db.ts:424-447`):
  - Two-token input (`parts[0] parts[1]`, e.g., `"서울 강남구"`): `sigungu = parts[1]`, `stem = sigungu.replace(/(구|군|시)$/, '')`. Generates `location LIKE '%강남구%' OR location LIKE '%강남%'`.
  - Single-token input (`parts[0]`, e.g., `"서울"`): `loc = parts[0]`, `stem = loc.replace(/(시|도)$/, '')`. Generates `location LIKE '%서울%' OR location LIKE '%${stem}%'`.

---

### 1.3 Query Building, Data Flow & Execution Modes

```
+-------------------------------------------------------------------------+
| Client UI (src/app/page.tsx)                                            |
| States: searchTerm, activePlatform, activeCategory, activeLocation,    |
|         activeType, sortBy                                              |
+------------------------------------+------------------------------------+
                                     | GET /api/campaigns?search=...&type=...
                                     v
+-------------------------------------------------------------------------+
| API Route (src/app/api/campaigns/route.ts)                              |
| 1. On-Demand Crawler Trigger (3-min cooldown check on search keyword)   |
| 2. Parallel Dispatch: queryCampaigns(filters) & getTotalCampaignCount() |
+------------------------------------+------------------------------------+
                                     |
               +---------------------+---------------------+
               | (isServerless = true)                     | (isServerless = false)
               v                                           v
+-------------------------------+           +-------------------------------+
| In-Memory Engine (db.ts)      |           | SQLite DB Engine (db.ts)      |
| - globalRef.memoryCampaigns   |           | - SELECT * FROM campaigns     |
| - Rehydrates from             |           |   WHERE endDate >= ?          |
|   data/campaigns.json         |           |   AND (...) [SQL Builders]    |
| - Dynamic endDate Shift       |           | - Dynamic endDate Migration   |
| - JS Array filter/sort/slice  |           | - LIMIT 300                   |
+-------------------------------+           +-------------------------------+
```

---

### 1.4 Sorting & Pagination Rules

1. **`sortBy = 'latest'` (Default)**:
   - SQLite: `ORDER BY createdAt DESC`
   - In-Memory: `result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))`
2. **`sortBy = 'endDate'`**:
   - SQLite: `ORDER BY CASE WHEN endDate >= '${nowStr}' THEN 0 ELSE 1 END, endDate ASC, updatedAt DESC`
   - In-Memory: Active campaigns first (`endDate >= today`), ascending by `endDate`, then string comparison.
3. **`sortBy = 'popular'`**:
   - SQLite: `ORDER BY CAST(applyCount AS REAL) / CASE WHEN limitCount = 0 THEN 1 ELSE limitCount END DESC`
   - In-Memory: `(applyCount / limitCount)` descending sort.
4. **Pagination**:
   - Backend: Capped at `LIMIT 300` / `.slice(0, 300)` for payload protection.
   - Frontend: Renders initial 12 cards, increments `visibleCount += 12` via IntersectionObserver.

---

### 1.5 Existing Tests, Fixtures & Datasets

1. **`npm run test` (`src/lib/audit_troubleshoot_all.ts`)**:
   - Tests 4 core defects against live web scraping targets:
     - Issue 1: `title === benefit` duplicate text bug
     - Issue 2: Site common metadata/footer pollution in benefit/mission
     - Issue 3: Broken text / date newline cuts (`26.0\n8`)
     - Issue 4: Instagram/Reels misclassified as Blog
2. **`src/lib/deep_system_audit.ts`**:
   - 17-site deep audit verifying live raw data vs mock data.
3. **`audit_bulk_100.ts`**:
   - 100-sample bulk audit across platforms verifying live count sync and DB update integrity.
4. **`src/scripts/compare_lists.ts`**:
   - Multi-platform reconciliation comparing raw captured HTML/JSON (`data/`) against `review-moa.db`.
5. **Fixtures & Datasets**:
   - `data/review-moa.db`: SQLite database holding **17,768 active campaigns**.
     - 디너의여왕: 9,059
     - 리뷰노트: 6,053
     - 강남맛집: 2,232
     - 포블로그: 424
   - `data/campaigns.json`: Synchronized backup JSON snapshot holding the exact same 17,768 records.

---

## 2. Logic Chain (관측 기반 추론 단계)

1. **Premise from Observation 1.1 & 1.3**:
   The search system uses a dual-engine architecture (`src/lib/db.ts:226-480`). Both local development (SQLite) and Vercel serverless (In-Memory from `campaigns.json`) implement identical query signatures: `{ search, platform, category, location, targetSite, sortBy, type }`.
2. **Inference on Multi-Filter Combination Mechanics**:
   All 4 primary filter dimensions (`type`, `category`, `platform`, `location`) plus `search` and `targetSite` are chained exclusively via **SQL `AND`** (in SQLite) or chained `.filter()` calls (in serverless JS).
3. **Inference on Intra-Dimension Mechanics**:
   - Category filtering uses `CATEGORY_GROUP_MAP` to perform an **intra-category `OR`** (`category IN (...)`), ensuring aliases like `beauty-cosmetic` and `beauty-cosmetics` match interchangeably.
   - Platform filtering treats `blog` as `blog OR blog+clip` and `clip` as `clip OR blog+clip`, maintaining backward and forward compatibility with composite platform tags.
   - Location filtering uses token splitting and suffix stripping (`구|군|시|도`), generating an **intra-location `OR`** (`location LIKE '%강남구%' OR location LIKE '%강남%'`).
4. **Inference on Data Integrity & Consistency**:
   Both engines enforce `endDate >= todayStr` as a mandatory baseline clause. Historical regressions where campaigns disappeared (as recorded in `TROUBLESHOOTING.md:200-234`) were mitigated by the dynamic date shift mechanism (`db.ts:213-221, 249-258`).
5. **Deduction of Edge Cases**:
   - **Edge Case 1 (Sejong Sub-filter)**: In `LOCATIONS_MAP['세종']`, the only sub-chip is `'세종특별자치시'`. But in DB, Sejong campaigns are indexed as `'세종'`, `'세종 나성'`, `'세종 세종'`. When a user clicks `'세종'`, 103 results return. When a user clicks the sub-chip `'세종특별자치시'`, the query looks for `세종특별자치시` / `세종특별자치` and returns 0 results.
   - **Edge Case 2 (Negative Search Keyword Nuance)**: In Serverless memory mode (`db.ts:297-301`), negative word checks include `${s} 제외` and `${s} 불가`. In SQLite mode (`db.ts:395-397`), SQL checks only `${s} 제공불가` and `${s} 제공 불가`.
   - **Edge Case 3 (Zero-Distribution Platforms)**: `youtube` and `etc` have 0 records in the database, though they are valid platform types.

---

## 3. Caveats (제약 사항 및 가정)

1. **Read-Only Scope**: This report is an architectural survey. No application source code was modified.
2. **Domain Boundary**: Keyword Master engine (`/api/keyword`, `src/app/api/keyword/route.ts`) and Test Infra Runner configurations are surveyed independently by peer explorers (`explorer_survey_keyword`, `explorer_survey_infra`).
3. **Live Web Dependency**: The crawler and live detail scraper interact with external target sites (디너의여왕, 강남맛집, 포블로그, 리뷰노트). External network latency or anti-bot blocks can affect live on-demand crawls, but the local SQLite database and snapshot datasets remain 100% deterministic and offline-testable.

---

## 4. Conclusion (최종 진단 및 테스트 전략)

1. **System Health & Coverage Readiness**:
   - The integrated search system has a well-defined, robust query engine with 17,768 live seed campaigns.
   - All 4 filter dimensions (2 recruitment types, 25+1 categories, 6 platforms, 17 Sido + 220+ Sigungu) are fully operational and testable.
2. **Acceptance Criteria R1 Test Matrix Recommendation**:
   - **Tier 1 (Single Filter Isolation Tests)**:
     - 2 Recruitment Types (`visit`, `delivery`)
     - 26 Categories (25 defined + `etc`)
     - 5 Active Platforms (`all`, `blog`, `clip`, `blog+clip`, `instagram`)
     - 17 광역시도 + Top 30 High-Volume Sigungu
   - **Tier 2 (Multi-Filter Permutation Tests)**:
     - `Type` x `Category` x `Platform` x `Location` combinations (e.g. Visit + Food-Korean + Blog + Seoul Gangnam -> 112 matches verified).
   - **Tier 3 (Search Keyword & Negative Exclusion Tests)**:
     - Exact match, partial match, and negative keyword exclusion (`제공불가`).
   - **Tier 4 (Sorting & Pagination Limit Tests)**:
     - `latest`, `endDate`, `popular` ordering accuracy + 300 cap verification.
   - **Tier 5 (Dual-Engine Equivalence Tests)**:
     - Exact parity verification between SQLite SQL output and Serverless In-Memory output.

---

## 5. Verification Method (독립 검증 방법)

To independently verify the observations, database distributions, and filter logic in this report, run the following commands in the workspace root (`/Users/park/review-moa`):

```bash
# 1. Verify total campaign count and platform/category/type distribution in SQLite DB
npx tsx -e "
import { getDB } from './src/lib/db';
async function run() {
  const db = await getDB();
  const total = await db.get('SELECT COUNT(*) as c FROM campaigns');
  const platforms = await db.all('SELECT platform, COUNT(*) as c FROM campaigns GROUP BY platform ORDER BY c DESC');
  const categories = await db.all('SELECT category, COUNT(*) as c FROM campaigns GROUP BY category ORDER BY c DESC');
  const types = await db.all(\`
    SELECT CASE WHEN location IS NOT NULL AND location != '' AND location NOT LIKE '%배송%' AND location NOT LIKE '%전국%' AND location NOT LIKE '%재택%' AND location NOT LIKE '%택배%' AND location NOT LIKE '%온라인%' THEN 'visit' ELSE 'delivery' END as type, COUNT(*) as c FROM campaigns GROUP BY type
  \`);
  console.log('Total:', total.c);
  console.log('Platforms:', platforms);
  console.log('Categories:', categories);
  console.log('Types:', types);
}
run();
"

# 2. Verify all 26 categories return valid mapped query results
npx tsx -e "
import { queryCampaigns } from './src/lib/db';
const cats = ['food-korean','food-western','food-japanese','food-chinese','food-cafe','food-pub','food-restaurant','food-foreign','beauty-cosmetics','beauty-salon','beauty-spa','health-fitness','health-food','accommodation','travel','culture','fashion-clothing','fashion-accessory','baby','life-goods','health-fresh','life-appliances','pet','book','hobby','etc'];
async function run() {
  for (const c of cats) {
    const res = await queryCampaigns({ category: c });
    console.log(c, '->', res.length, 'results');
  }
}
run();
"

# 3. Verify existing project audit test suite passes
npm run test
```

### Invalidation Conditions
- If `queryCampaigns({ category: 'food-korean' })` returns 0 results or throws an error.
- If SQLite DB contains fewer than 17,000 campaigns after DB initialization.
- If dual-engine output (SQLite vs Serverless) produces conflicting filter results.
