# Crawling & Data Synchronization Architecture Document

## 1. 개요 (Overview)
본 문서는 `review-moa` (viral_re) 시스템의 체험단 플랫폼 데이터 수집, 실시간 키워드 크롤링 파이프라인, DB 갱신 메커니즘 및 데이터 무결성 보장 로직을 설명합니다.

2026-09-16 라이브 재검증 기준으로 유지 중인 수집 모듈은 13개입니다. 과거 문서의 “17개 플랫폼 정상” 평가는 당시 스냅샷이며 현재 상태를 뜻하지 않습니다. 사이트 개편이나 EC2 IP 차단은 `npm run test:live`로 다시 확인해야 합니다. 출처별 목록·상세 필드 계약은 [SOURCE_PARSING.md](SOURCE_PARSING.md)에 관리합니다.

---

## 2. 수집 경로 구조 (Dual Engine Architecture)

| 구분 | 벌크 무인 자동 수집 (Bulk Crawler) | 온디맨드 실시간 수집 (On-Demand Crawler) |
|---|---|---|
| **트리거** | 10분 마다 백그라운드 자동 실행 (`/api/crawl`) | 사용자 검색 시 비동기 넌블로킹 실행 (`/api/campaigns`) |
| **수집 범위** | 유지 중인 13개 수집 모듈의 메인/목록 페이지 | 검색 키워드 타겟 파싱 (사이트별 파서) |
| **모듈 위치** | `src/lib/crawler-core.ts` (`runCrawlerCore`) | `src/lib/crawler-parallel.ts` (`crawlKeywordOnDemandParallel`) |
| **UX 영향** | 예약 호출 시 백그라운드 구동 | 응답 후 비동기 수집 |

현재 대상은 강남맛집, 디너의여왕, 포블로그, 리뷰노트, 클라우드리뷰, 레뷰, 미블, 링블, 놀러와체험단, 모블, 아싸뷰, 오마이블로그, 리뷰플레이스입니다. 체험뷰와 구형 링블·아싸뷰 URL을 쓰던 중복 모듈은 운영 경로에서 제거했습니다. 클라우드리뷰와 리뷰플레이스는 목록 뒤 현재 공고의 상세 페이지를 보강해 `모집 기간`을 저장합니다. 수집기가 원본 마감일을 제공하지 않는 공고는 임의 날짜를 만들지 않으며, 마지막 실수집 후 48시간 동안만 현재 목록으로 노출합니다.

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
   - 원본 마감일이 있는 공고는 `endDate >= todayStr` 조건을 적용합니다. 원본 사이트가 마감일을 제공하지 않는 공고는 실제 수집 시각이 48시간 이내인 경우에만 노출합니다.
2. **검색어 연관성 1:1 직접 매칭 보장 (Anti-Pollution)**:
   - 검색어 매칭 시 오염된 키워드 태그(`searchKeywords`) 매칭을 제외하고 제목, 혜택 본문, 위치, 미션, 출처 사이트명에 검색어가 직접 포함된 공고만 출력합니다.
3. **SQLite 스냅샷 보호 (Snapshot Guard)**:
   - `data/campaigns.json` 스냅샷 파일이 1,000건 미만의 빈 데이터로 오버라이드되는 현상을 코드 레벨에서 차단하여 DB 안전성을 보장합니다.
