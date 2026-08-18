# 🏛️ 리뷰모아 (Review-Moa) 시스템 아키텍처 및 회귀 방지(Anti-Regression) 규범 문서

> **최종 개정일**: 2026-08-18  
> **목적**: 코드 수정 시 다른 기능이 다시 파손(회귀)되는 현상을 100% 영구 차단하기 위한 시스템 구조 명세 및 자동화 검증 규범

---

## 1. 🔄 파이프라인 구조 및 회귀 발생 원인 분석

### 왜 수정했던 문제가 자꾸 다시 재발하였는가? (Root Cause)

리뷰모아 시스템은 데이터 수집부터 프론트엔드 노출까지 **2개의 이중 파이프라인(Dual Pipeline)** 구조로 동작합니다:

```
[1차 목록 수집 파이프라인] -- (검색/Cron) --> SQLite DB & JSON 스냅샷 --> 목록 카드 (Card List)
[2차 상세 수집 파이프라인] -- (모달 클릭) -> /api/campaign-detail    --> 상세 모달 (Detail Modal)
```

#### 회귀 현상의 3대 발생 원인:
1. **2차 상세 수집 파이프라인 수정 후 1차 목록 수집 파이프라인의 오염 미정제**:
   * 상세 모달 스크레이퍼(`detail-scraper.ts`)를 수정하더라도, 1차 목록 크롤러(`crawler-parallel.ts`, `crawler-core.ts`) 내부의 구형 템플릿/대체 텍스트 생성기가 살아있어 **새로운 검색 실행 시 1차 크롤러가 구형 데이터(제목=혜택, 시그니처 체험권, 오염 태그 등)로 DB를 다시 덮어씌움**.
2. **프론트엔드 State 갱신 파이프라인의 `realBenefit` 대입 누락**:
   * 상세 API(`/api/campaign-detail`)가 원본 혜택을 정상 추출해 반환해도, `page.tsx` 모달 state 업데이트에서 `description: data.realBenefit`을 갱신하지 않아 기존 1차 파이프라인의 미흡한 텍스트가 유지됨.
3. **자동화 검증(CI/CD Assert) 절차의 부재**:
   * 수정 후 수동 점검만 수행하여, 빌드(`npm run build`) 시 전체 17개 사이트의 회귀 여부를 자동 검증하는 가드레일이 적용되지 않았음.

---

## 2. 🛡️ 회귀 영구 차단 4대 시스템 규범 (Golden Rules)

### 1대 규범: 1차 수집기 & 2차 수집기 100% 동일 원칙 (Single Source of Truth)
- 목록 크롤러(`crawler-parallel.ts`, `crawler-core.ts`)와 상세 스크레이퍼(`detail-scraper.ts`)는 **동일한 정제 및 파싱 로직**을 공유해야 함.
- 1차 수집 시 혜택이 비어있는 경우, **절대로 가짜 템플릿 문구(`시그니처 체험권`, `대표 혜택` 등)를 지어내어 저장하지 않음**.

### 2대 규범: 프론트엔드 모달 실시간 수복 보증
- 상세 모달이 열릴 때 백엔드가 추출한 `realBenefit`, `mission`, `applyCount`, `limitCount` 4대 핵심 데이터를 **프론트엔드 Modal State 및 List State에 즉시 100% 실시간 갱신**함.

### 3대 규범: 검색 키워드 태그 오염 금지 (Strict Search Matching)
- 검색 실행 시 공고의 `searchKeywords`에 검색어를 임의로 주입하지 않음.
- DB 조회 시 `searchKeywords`에 의존하지 않고 **`title`, `description`, `location` 3대 원본 필드**에서 부정어(`제공불가`, `제외`)를 자동으로 차단하는 정밀 조건검색만 수행함.

### 4대 규범: 빌드 시 자동 회귀 테스트 필수 수행 (Automated Build Guardrail)
- `npm run build` 실행 시 **17대 사이트 전수 트러블슈팅 검증 스크립트(`npm run test`)가 빌드 전 자동 실행**됨.
- 단 하나의 사이트라도 혜택-제목 겹침, 인위적 템플릿 발생, 이미지 엑박이 감지되면 **빌드가 자동으로 중단(Fail)**됨.

---

## 3. 📊 17대 주요 사이트별 데이터 파싱 표준 명세

| 사이트 | 1차 목록 수집 소스 | 2차 상세 혜택 추출 태그 / API | 이미지 CDN 주소 표준 |
| :--- | :--- | :--- | :--- |
| **디너의여왕** | `dinnerqueen.net/taste` HTML | `.qz-collapse` 내 `제공 내역` 헤더 ➔ `strong/p` | 원본 카드 이미지 |
| **강남맛집** | `939au0g4vj8sq.net/cp/` HTML | `dd.sub_tit` (관용구 `가이드라인 참고...` 제거) | `https:` 보안 프로토콜 보정 |
| **포블로그** | `4blog.net/loadMoreData...` API | `REVIEWER_BENEFIT` 및 `.campaigninfo-text` | `https://d3oxv6xcx9d0j1.cloudfront.net/public/pr/...` |
| **리뷰노트** | `reviewnote.co.kr/campaigns` JSON | `props.pageProps.data.objects[i].offer` | `https://firebasestorage.googleapis.com/v0/b/reviewnote-e92d9.appspot.com/o/...` |

---

## 4. 🧪 회귀 검증 실행 가이드 (Verification Command)

```bash
# 1. 17대 사이트 트러블슈팅 회귀 전수 검사 실행
npm run test

# 2. 검사 통과 후 프로덕션 검증 빌드
npm run build
```
