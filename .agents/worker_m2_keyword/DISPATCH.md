# DISPATCH — worker_m2_keyword

Read `/Users/park/review-moa/.agents/ORIGINAL_REQUEST.md`, `/Users/park/review-moa/PROJECT.md`, `/Users/park/review-moa/TEST_INFRA.md`, and `/Users/park/review-moa/.agents/explorer_survey_keyword/handoff.md`.

Task:
Implement the automated precision test suite for Keyword Master in `/Users/park/review-moa/tests/e2e_keyword_master.test.ts`.
1. Test representative sample groups: 다의어 (`시장`), 카테고리 (`삼겹살`), 브랜드 (`메가커피`), 지역 (`제주도`), 복합어 (`강남 맛집`), plus boundary/edge terms.
2. Verify entity classification accuracy, category preset ranking integrity, and noise filtering.
3. Test search volume synchronization:
   - Check $PC + Mobile = Total$ consistency across all returned keywords.
   - Assert $100\%$ match between related keywords list volumes and single keyword detail lookup. (Use slight throttle/delay or cache as needed to avoid Naver 429).
4. Test 2nd hint (`fetchSearchAdBatch`, `fetchSingleKeywordAd`) extraction and coverage.
5. Execute the test using `npx tsx tests/e2e_keyword_master.test.ts` and document all outputs and statistics in `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
