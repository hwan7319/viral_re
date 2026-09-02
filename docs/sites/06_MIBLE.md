# Site Audit Document: 06. 미블 (Mible)

## 1. 개요 (Overview)
- **사이트명**: 미블 (Mible / 미스터블로그)
- **공식 도메인**: `https://www.mrblog.net`
- **주요 수집 대상**: 블로그 체험단, 인스타그램 릴스 체험단, 지역 맛집, 뷰티, 배송형 혜택
- **연동 파이프라인**:
  - `src/lib/crawler-core.ts` (`crawlKeywordOnDemand`)
  - `src/lib/crawler-parallel.ts` (`crawlKeywordOnDemandParallel`)

## 2. 수집 사양 및 파서 구조 (Crawler Spec)
- **Target URL**: `https://www.mrblog.net`
- **HTTP Header 필수 조건**:
  - `User-Agent`: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ...`
  - `Referer`: `https://www.mrblog.net/`
- **DOM Selector**:
  - 캠페인 카드 요소: `a[href*="/campaigns/"]`
  - 제목 파싱: `$(el).text().trim().replace(/\s+/g, ' ')`
  - 이미지 파싱: `$(el).find('img').attr('src')`
  - 고유 ID 파싱: `mb-${cpId}` (`/campaigns/1128617` -> `mb-1128617`)

## 3. 검증 결과 및 이슈 해결 트러블슈팅 (Troubleshooting)

### 이슈 1: 도메인 변경 호환성 (`mible.co.kr` -> `mrblog.net`)
- **현상**: `mible.co.kr` 접속 시 `ENOTFOUND` 에러 발생.
- **원인**: 미블 서비스의 공식 도메인이 `www.mrblog.net`으로 이전되었음.
- **조치**: 크롤러 타겟 URL을 `https://www.mrblog.net`으로 100% 최신화.

### 이슈 2: UI 검색 시 미블 공고 미출력 현상
- **현상**: 웹 UI에서 검색 시 리뷰노트 공고만 표시되고 미블 공고가 누락됨.
- **원인**: 웹 UI API (`/api/campaigns/route.ts`)가 호출하는 병렬 수집 파일 (`src/lib/crawler-parallel.ts`)에 미블 파서 모듈이 등록되지 않아 `crawler-core.ts`만 갱신되었던 현상.
- **조치**: `src/lib/crawler-parallel.ts` 내 병렬 실행 배열(Promise.all)에 미블 수집 모듈을 100% 동기화 등록 완료.

### 이슈 3: 무관한 미블 메인 공고(홈즈앤루팡, 옆커폰, 샐럽스프 등)의 검색 키워드 태그오염 현상
- **현상**: `상무초밥` 검색 시 제목에 `상무초밥`이 포함되지 않은 미블 메인 페이지의 `홈즈앤루팡`, `옆커폰`, `샐럽스프` 공고들이 검색 결과에 오염되어 함께 출력되는 현상.
- **원인**: 미블 메인 페이지에서 수집한 전 공고에 검색 키워드(`searchKeywords: ,${keyword},`)가 제목 포함 여부 검증 없이 무조건 태깅되었던 필터링 결함.
- **조치**: `if (keyword && !rawTitle.toLowerCase().includes(keyword.toLowerCase())) return;` 엄격한 제목 검증 필터를 파서에 탑재하여 제목에 검색어가 정확히 포함된 미블 공고만 선별 수집되도록 완벽 수정.

### 이슈 4: DB 기존 행의 오염된 태그로 인한 검색 노이즈 재발 현상 (영구 차단 완료)
- **현상**: 크롤러 코드 수정 후에도 기존 DB/메모리에 이미 저장된 오염 태그로 인해 `홈즈앤루팡` 등이 검색 결과에 지속 노출됨.
- **원인**: `queryCampaigns` 검색 엔진이 `searchKeywords LIKE %상무초밥%` 태그 매칭을 허용하여 과거 오염된 DB 태그까지 검색어로 매칭시켰던 설계 결함.
- **조치**: `src/lib/db.ts` 검색 엔진 필터를 **제목(`title`), 본문(`description`), 위치(`location`), 미션(`mission`), 출처사이트(`targetSite`) 1:1 직결 직접 연관 매칭 방식**으로 개편하여 과거 오염 태그나 무관한 공고 노출을 100% 원천 차단.

## 4. 라이브 검증 데이터 샘플 (Live Audit Verification)
- **상무초밥 검색 결과 (4건 100% 순수 매칭)**:
  1. `상무초밥 종로점` (리뷰노트)
  2. `상무초밥 왕십리점` (리뷰노트)
  3. `일산 장항동 상무초밥 일산라페스타점` (미블)
  4. `상무초밥 동래점` (리뷰노트)

## 5. 상태 (Status)
- **상태**: 🟢 PERFECT (실시간 크롤링 & 병렬 검색 엔진 연동 100% 정상 가동)
