# 상세 검색 통합 QA — 2026-11-24

## 범위

상세 검색의 카테고리, 플랫폼, 모집유형, 지역, 출처 사이트에 대해 단일 선택, 같은 필드의 복수 OR 선택, 필드 사이 AND 선택, 3중 교차 선택을 점검했다. 정렬·페이지 이동은 수집을 시작하지 않아야 하므로 읽기 전용 요청(`crawl=false`)으로 API 계약도 별도 확인했다.

## 운영 데이터 매트릭스 결과

- 환경: EC2 운영 SQLite, 활성 공고 11,456건, 유지 출처 13곳
- 실행: `DATA_DIR=/home/ec2-user/viral_re/data node --import tsx src/scripts/audit-filter-matrix.ts`
- 조합: 4,159개, 재판정 행: 1,460,631개
- 조건 불일치 행: **0건**
- 빈 조합: 1,367개. 해당 교차 조건의 활성 공고가 없는 정상 결과로 분류했다.

검사에는 모든 카테고리×플랫폼, 카테고리×모집유형, 카테고리×지역, 카테고리×출처, 플랫폼×모집유형/지역/출처, 모집유형×지역/출처, 지역×출처, 각 필드 내 모든 2값 OR, 카테고리×플랫폼×모집유형이 포함된다.

## API 계약 결과

- 실행: `QA_BASE_URL=http://127.0.0.1:3000 DATA_DIR=/home/ec2-user/viral_re/data node --import tsx src/scripts/audit-api-filter-contract.ts`
- 요청: 123개. 실제 UI와 같은 반복 URL 파라미터를 사용했다.
- 검증: API `totalCount`, 최신순 첫 60개 ID가 `queryCampaigns` 결과와 동일한지 비교
- 실패: **0건**

대상은 전체/각 단일 카테고리·플랫폼·모집유형·대표 지역·대표 출처, 각 필드의 복수 선택, 카테고리×플랫폼×모집유형 및 카테고리×지역×출처 조합이다. 모든 요청에 `crawl=false`를 넣어 QA 과정에서 외부 사이트 수집이나 DB 쓰기가 발생하지 않게 했다.

## 회귀·상태

- TypeScript 검사, 회귀 테스트 47건, webpack 프로덕션 빌드 통과
- PM2 `viral-re`: online, 배포 릴리스 `dfcc3dd`
- HTTPS 홈 응답: 200
