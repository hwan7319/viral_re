# BRIEFING — 2026-09-02T10:58:00+09:00

## Mission
Investigate integrated search system (통합검색 시스템) in review-moa: filter dimensions, query builders, API endpoints, SQL/ORM filtering logic, multi-filter combinations, existing tests, and edge cases.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer (Read-only investigation)
- Working directory: /Users/park/review-moa/.agents/explorer_survey_search
- Original parent: 28a0177e-698c-4f59-a960-a2f6c4b76d1e
- Milestone: Search System Investigation & Architecture Mapping

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Write reports, handoffs, analysis inside /Users/park/review-moa/.agents/explorer_survey_search/
- Keep messages concise, report path in handoff

## Current Parent
- Conversation ID: 28a0177e-698c-4f59-a960-a2f6c4b76d1e
- Updated: 2026-09-02T10:58:00+09:00

## Investigation State
- **Explored paths**:
  - `src/app/api/campaigns/route.ts` (API route, search params, on-demand crawl triggers, CORS)
  - `src/lib/db.ts` (SQLite schema, `CATEGORY_GROUP_MAP`, `queryCampaigns` dual-mode, `insertOrUpdateCampaigns`, `search_logs`)
  - `src/app/page.tsx` (Frontend filter UI, `LOCATIONS_MAP`, real-time sync countdown, infinite scroll, touch guards)
  - `src/lib/crawler-parallel.ts`, `src/lib/crawler-core.ts`, `src/lib/detail-scraper.ts`
  - `src/lib/audit_troubleshoot_all.ts`, `src/lib/deep_system_audit.ts`, `audit_bulk_100.ts`, `src/scripts/compare_lists.ts`
  - `TROUBLESHOOTING.md`, `COMPREHENSIVE_STRICT_AUDIT_REPORT.md`, `DATA_INTEGRITY_AUDIT_REPORT.md`, `SYSTEM_ARCHITECTURE_AND_TROUBLESHOOTING.md`
  - Database verification via `npx tsx` CLI (17,768 campaigns across 4 target sites)
- **Key findings**:
  - 4 Filter Dimensions fully documented: Recruitment Type (2 types), Category (25 subcategories + etc + 4 major groups), Platform (4 active + 2 schema types), Region (17 Sido + 220+ Sigungu).
  - Dual execution engine: Serverless in-memory filter vs Local SQLite SQL query.
  - AND logic across dimensions; OR logic within grouped categories, stemmed locations, and composite platforms.
  - Identified edge case: `세종 세종특별자치시` sub-filter mismatch with DB location naming.
  - Identified slight negative keyword filter discrepancy between serverless and SQLite modes.
- **Unexplored areas**: None for search survey scope; Keyword Master engine and Infra runner surveyed by peer explorers.

## Key Decisions Made
- Fully documented all 25 categories, 17 Sido and Sigungu mappings, platform logic, and query builder mechanics into handoff report.

## Artifact Index
- DISPATCH.md — Task instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat & progress
- handoff.md — Final 5-component handoff report
