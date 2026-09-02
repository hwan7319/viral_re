# Crawling & Data Synchronization Architecture Document

## 1. 개요 (Overview)
본 문서는 `review-moa` (viral_re) 시스템의 **17대 체험단 플랫폼 데이터 수집, 실시간 키워드 크롤링 파이프라인, DB 갱신 메커니즘(Upsert Engine), 및 데이터 무결성 보장 로직**을 설명합니다.

---

## 2. 수집 경로 구조 (Dual Engine Architecture)

| 구분 | 벌크 무인 자동 수집 (Bulk Crawler) | 온디맨드 실시간 수집 (On-Demand Crawler) |
|---|---|---|
| **트리거** | 10분 마다 백그라운드 자동 실행 (`/api/crawl`) | 사용자 검색 시 비동기 넌블로킹 실행 (`/api/campaigns`) |
| **수집 범위** | 17대 체험단 메인/목록 페이지 전체 수집 | 검색 키워드 타겟 파싱 (사이트별 정밀 파서) |
| **모듈 위치** | `src/lib/crawler-core.ts` (`runCrawlerCore`) | `src/lib/crawler-parallel.ts` (`crawlKeywordOnDemandParallel`) |
| **UX 영향** | 24시간 무인 백그라운드 구동 | 사용자 대기 시간 0초 (비동기 Microtask 연동) |

---

## 3. 고유 ID 식별 및 Upsert 갱신 메커니즘 (Database Sync Engine)

### 3.1 1:1 고유 ID (Primary Key) 생성 규칙
원출처 사이트명과 고유 아이디를 결합하여 **절대 중복되지 않는 PK**를 부여합니다:
- **디너의여왕**: `dq-{id}` (예: `dq-1128617`)
- **강남맛집**: `gn-{id}` (예: `gn-93901`)
- **포블로그**: `pb-{CID}` (예: `pb-84920`)
- **리뷰노트**: `rn-{id}` (예: `rn-77123`)
- **미블**: `mb-{id}` (예: `mb-1128639`)
- **레뷰**: `revu-live-{id}`

### 3.2 3단계 Upsert (UPDATE / INSERT) 처리 로직
수집된 데이터는 `src/lib/db.ts:insertOrUpdateCampaigns` 함수를 통해 다음 3단계를 거칩니다:

```
[수집된 공고 수신]
       │
       ▼
[SELECT id FROM campaigns WHERE id = ?]
       │
       ├─► (DB에 없는 경우) ──► INSERT (신규 등록: id, title, benefit, platform 등 생성)
       │
       └─► (DB에 있는 경우) ──► UPDATE (최신화: applyCount, limitCount, endDate, updatedAt 갱신)
```

1. **DB 대조 (`SELECT`)**: 긁어온 공고 ID가 기존 18,000여 건 DB 안에 존재하는지 검사.
2. **신규 추가 (`INSERT`)**: 기존 DB에 없는 새 공고일 경우 신규 로우(Row) 추가 (`inserted` 카운터 증가).
3. **선택적 조준 갱신 (`UPDATE`)**: 기존 DB에 이미 존재하는 공고인 경우 전체 덮어쓰기가 아닌 **신청자 수(`applyCount`), 정원(`limitCount`), 마감일(`endDate`), 업데이트 시각(`updatedAt`)만 최신 정보로 갱신** (`updated` 카운터 증가).

---

## 4. 마감 공고 정제 및 무결성 보장 (Data Integrity)

1. **당일 마감건 자동 정제**:
   - `queryCampaigns` 검색 시 `WHERE endDate >= todayStr` SQL/배열 조건을 적용하여, 기간이 경과된 마감 공고는 화면에서 즉시 자동 제외됩니다.
2. **검색어 연관성 1:1 직접 매칭 보장 (Anti-Pollution)**:
   - 검색어 매칭 시 오염된 키워드 태그(`searchKeywords`) 매칭을 제외하고, **제목(`title`), 혜택 본문(`description`), 위치(`location`), 미션(`mission`), 출처 사이트명(`targetSite`)에 검색어가 직접 1:1 포함된 공고만 출력**하여 엉뚱한 노이즈 공고 출력을 100% 차단합니다.
3. **SQLite 스냅샷 보호 (Snapshot Guard)**:
   - `data/campaigns.json` 스냅샷 파일이 1,000건 미만의 빈 데이터로 오버라이드되는 현상을 코드 레벨에서 차단하여 DB 안전성을 보장합니다.
