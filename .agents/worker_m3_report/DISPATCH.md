# DISPATCH — worker_m3_report

Read `/Users/park/review-moa/.agents/ORIGINAL_REQUEST.md`, `/Users/park/review-moa/PROJECT.md`, `/Users/park/review-moa/TEST_INFRA.md`, `/Users/park/review-moa/.agents/worker_m1_search/handoff.md`, and `/Users/park/review-moa/.agents/worker_m2_keyword/handoff.md`.

Task:
1. Implement a unified test master runner `/Users/park/review-moa/tests/e2e_full_suite.ts` that executes both `tests/e2e_search_filter.test.ts` and `tests/e2e_keyword_master.test.ts` with timing, aggregate statistics, and formatted markdown reporting output.
2. Execute `npx tsx tests/e2e_full_suite.ts`.
3. Generate the comprehensive quantitative verification report at `/Users/park/review-moa/FINAL_TEST_REPORT.md` (or update existing report artifacts) with detailed tables:
   - Overall pass rates and accuracy percentages across all test tiers (Tiers 1-5).
   - Search filter accuracy matrix (Recruitment types, 25 Categories + etc, Platforms, 17 광역시도 & Sigungu, Multi-filter combinations, Dual-engine parity).
   - Keyword Master quality matrix (다의어 '시장', 카테고리 '삼겹살', 브랜드 '메가커피', 지역 '제주도', 복합어 '강남 맛집', ranking integrity, 100% volume synchronization, 2nd hint extraction).
   - Edge cases, error metrics, and performance latency.
4. Update `/Users/park/review-moa/TROUBLESHOOTING.md` documenting all identified exceptions, root causes, permanent solutions, and preventive guidelines adhering strictly to the 4-section schema:
   - Issue: Search Dual-Engine EndDate Offset & Deterministic Sorting Tie-Breaker Mismatch
   - Issue: Keyword Master Polysemous Entity Classification & Road Name Regex Boundary
   - Issue: Keyword Fallback Volume Estimation PC/Mobile Mathematical Consistency ($PC+Mobile=Total$)
   - Issue: Naver SearchAd API 429 Rate Limit Mitigation during Bulk Sequential Queries
5. Document all actions and verification in `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
