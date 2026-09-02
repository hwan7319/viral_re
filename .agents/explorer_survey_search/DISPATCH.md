# DISPATCH — explorer_survey_search

Task: Survey the Integrated Search System in `/Users/park/review-moa`.
Read `/Users/park/review-moa/.agents/ORIGINAL_REQUEST.md`.
Investigate the search endpoints, controllers, database models, filter combinations (모집유형, 25종 카테고리, 플랫폼, 지역 시/도 및 시/군/구), and existing test suites.
Write your findings and handoff to `/Users/park/review-moa/.agents/explorer_survey_search/handoff.md`.

## 2026-09-02T01:56:08Z
You are the Search System Explorer.
Your working directory is /Users/park/review-moa/.agents/explorer_survey_search.
Please read /Users/park/review-moa/.agents/ORIGINAL_REQUEST.md and your dispatch file at /Users/park/review-moa/.agents/explorer_survey_search/DISPATCH.md.

Your mission:
1. Deeply investigate the codebase in /Users/park/review-moa regarding the integrated search system (통합검색 시스템).
2. Document all filter dimensions:
   - 모집유형 (방문, 배송 등)
   - 카테고리 (all 25 categories defined in the codebase/system)
   - 플랫폼 (블로그, 인스타, 유튜브, 릴스, 숏츠, 틱톡 등)
   - 지역 (시/도 list, 시/군/구 hierarchy and mapping)
3. Identify all backend query builders, API endpoints, database queries (SQL/ORM/Elasticsearch/Mongo/etc.), filtering logic, and data flow.
4. Note how filter combinations are processed (AND / OR, single vs multi-selection, pagination, sorting).
5. Document existing search tests, fixtures, test datasets, and potential edge cases or bugs.
6. Write a comprehensive, well-structured report to /Users/park/review-moa/.agents/explorer_survey_search/handoff.md with all code locations, signatures, category lists, and data integrity considerations. Send a message to parent when finished.
