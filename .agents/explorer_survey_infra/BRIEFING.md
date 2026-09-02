# BRIEFING — 2026-09-02T10:58:30+09:00

## Mission
Survey the build/execution, testing infrastructure, test runners, database/mock configurations, test suites/fixtures, and TROUBLESHOOTING.md guidelines in `/Users/park/review-moa`.

## 🔒 My Identity
- Archetype: explorer
- Roles: Testing & Infra Explorer
- Working directory: /Users/park/review-moa/.agents/explorer_survey_infra
- Original parent: 28a0177e-698c-4f59-a960-a2f6c4b76d1e
- Milestone: survey

## 🔒 Key Constraints
- Read-only investigation — do NOT modify project source code
- Write only to /Users/park/review-moa/.agents/explorer_survey_infra
- Provide exact commands, paths, line numbers, and configs

## Current Parent
- Conversation ID: 28a0177e-698c-4f59-a960-a2f6c4b76d1e
- Updated: 2026-09-02T10:58:30+09:00

## Investigation State
- **Explored paths**:
  - `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`
  - `.env.example`, `.env.local`
  - `README.md`, `AGENTS.md`, `TROUBLESHOOTING.md`, `SYSTEM_ARCHITECTURE_AND_TROUBLESHOOTING.md`, `COMPREHENSIVE_STRICT_AUDIT_REPORT.md`, `DATA_INTEGRITY_AUDIT_REPORT.md`
  - `src/lib/db.ts`, `src/lib/crawler-parallel.ts`, `src/lib/crawler-core.ts`, `src/lib/detail-scraper.ts`
  - `src/lib/audit_troubleshoot_all.ts`, `src/lib/audit_all_sites.ts`, `src/lib/deep_system_audit.ts`, `audit_bulk_100.ts`
  - `src/app/api/campaigns/route.ts`, `src/app/api/keyword/route.ts`, `src/app/api/campaign-detail/route.ts`
  - `src/app/page.tsx`, `data/review-moa.db`, `data/campaigns.json`
- **Key findings**:
  - Tech stack: Node v24.6.0, npm 11.5.1, Next.js 16.2.12 (App Router), React 19.2.4, TypeScript 5, tsx 4.23.1, SQLite3 (5.1.1/6.0.1), Axios 1.19.0, Cheerio 1.2.0.
  - Test command in package.json is `npm run test` -> `npx tsx src/lib/audit_troubleshoot_all.ts`. Custom test suites run via `npx tsx <script.ts>`.
  - Database contains 17,768 records in SQLite (`data/review-moa.db`) and JSON snapshot (`data/campaigns.json`).
  - Search filter handles 3 recruitment types ('all', 'visit', 'delivery'), 25+ categories via `CATEGORY_GROUP_MAP`, 5+ platforms, 17 Sido and 250+ Sigungu.
  - Keyword API (`/api/keyword`) live queries Naver Search Ad and Blog Search APIs with real-time metrics and presets.
  - TROUBLESHOOTING.md follows a 4-part schema: 현상 (Symptom), 원인 분석 (Root Cause), 영구 수정 및 해결 조치 (Permanent Solution), 재발 방지 가이드라인 (Preventive Directive).
- **Unexplored areas**: None for survey phase.

## Key Decisions Made
- Fully documented all infra components, execution scripts, data schemas, and TROUBLESHOOTING.md conventions in `handoff.md`.

## Artifact Index
- /Users/park/review-moa/.agents/explorer_survey_infra/BRIEFING.md — Working memory
- /Users/park/review-moa/.agents/explorer_survey_infra/progress.md — Progress heartbeat
- /Users/park/review-moa/.agents/explorer_survey_infra/handoff.md — Final investigation report
