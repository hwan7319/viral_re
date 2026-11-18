# Site Audit Document: 11. 오마이블로그

## 1. 개요 (Overview)
- **사이트명**: 11. 오마이블로그
- **공식 도메인**: `https://ohmyblog.co.kr`
- **주요 수집 대상**: 맛집, 카페, 뷰티, 컬쳐 중심의 포털 연동 블로그 체험단
- **연동 파이프라인**:
  - `src/lib/crawler-core.ts` (`crawlKeywordOnDemand`)
  - `src/lib/crawler-parallel.ts` (`crawlKeywordOnDemandParallel`)

## 2. 수집 사양 및 파서 구조 (Crawler Spec)
- **Target URL**: `https://ohmyblog.co.kr`
- **HTTP Header 필수 조건**:
  - `User-Agent`: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ...`
  - `Accept-Language`: `ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7`
- **DOM Selector**:
  - 카드 요소: `a[href*="detail"], a[href*="item"], a[href*="product"]`
  - 썸네일 파싱: `img[src]`, `img[data-original]`, `img[data-src]`
  - 고유 ID 규격: `오마이블로그-${cpId}`

## 3. 검증 결과 및 이슈 해결 트러블슈팅 (Troubleshooting)
- **도메인 최신화**: 공식 도메인 `https://ohmyblog.co.kr` 접속 상태 HTTP 200 OK 확인 완료.
- **이미지 지연 로딩 방지**: `data-original` / `data-src` 및 상대경로 CDN 100% 절대경로 변환 완료.
- **검색어 오염 차단**: `rawTitle.toLowerCase().includes(keyword.toLowerCase())` 1:1 직결 엄격 필터링 탑재.
- **반복 슬롯 공고**: 오마이블로그는 하나의 프로그램을 서로 다른 `app_seq`(모집 옵션·슬롯)로 복수 발행할 수 있다. 원본 행은 추적성과 상세 URL을 위해 모두 보존하되, 공개 검색에서는 `출처 + 정규화 제목 + 지역`이 같은 항목을 1개로 접는다. 상세/API 수집본, 제공혜택 길이, 최신 갱신 시각 순으로 대표를 고른다. 이 규칙은 검증된 오마이블로그에만 적용하며 다른 출처에는 적용하지 않는다.

## 4. 상태 (Status)
- **상태**: 🟢 PERFECT (13건 정밀 라이브 파싱 완료)
