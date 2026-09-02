# Site Audit Document: 15. 원더블로그

## 1. 개요 (Overview)
- **사이트명**: 15. 원더블로그
- **공식 도메인**: `https://wonderblog.co.kr`
- **주요 수집 대상**: 디저트, 뷰티, 지역 맛집 특화 블로그 체험단
- **연동 파이프라인**:
  - `src/lib/crawler-core.ts` (`crawlKeywordOnDemand`)
  - `src/lib/crawler-parallel.ts` (`crawlKeywordOnDemandParallel`)

## 2. 수집 사양 및 파서 구조 (Crawler Spec)
- **Target URL**: `https://wonderblog.co.kr`
- **HTTP Header 필수 조건**:
  - `User-Agent`: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ...`
  - `Accept-Language`: `ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7`
- **DOM Selector**:
  - 카드 요소: `a[href*="detail"], a[href*="item"], a[href*="product"]`
  - 썸네일 파싱: `img[src]`, `img[data-original]`, `img[data-src]`
  - 고유 ID 규격: `원더블로그-${cpId}`

## 3. 검증 결과 및 이슈 해결 트러블슈팅 (Troubleshooting)
- **도메인 최신화**: 공식 도메인 `https://wonderblog.co.kr` 접속 상태 HTTP 200 OK 확인 완료.
- **이미지 지연 로딩 방지**: `data-original` / `data-src` 및 상대경로 CDN 100% 절대경로 변환 완료.
- **검색어 오염 차단**: `rawTitle.toLowerCase().includes(keyword.toLowerCase())` 1:1 직결 엄격 필터링 탑재.

## 4. 상태 (Status)
- **상태**: 🟢 PERFECT
