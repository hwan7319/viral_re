# Master Execution Plan: review-moa Precision Automated Testing & Verification

## Objective
Verify the review-moa integrated search system and Keyword Master extraction engine with precision automated testing, achieve 99%+ filter accuracy and 100% search volume sync, generate quantitative reports, and document troubleshooting findings in `TROUBLESHOOTING.md`.

## Workflow Phases
- [ ] **Phase 0: Architecture & Codebase Survey** (3 Parallel Explorers)
  - Explorer 1: Integrated search backend & filter query logic (모집유형, 25 카테고리, 플랫폼, 지역 시도/시군구)
  - Explorer 2: Keyword Master engine, Naver search ad API / related keyword extractor, volume sync, 2nd hint collection
  - Explorer 3: Test runner infra, database / seed data / API endpoints, TROUBLESHOOTING.md format & environment
- [ ] **Phase 1: Project Plan & Feature Inventory (`PROJECT.md` & `TEST_INFRA.md`)**
  - Synthesize explorer findings into comprehensive feature list, interface contracts, and test tier definitions
- [ ] **Phase 2: Milestone 1 - Integrated Search Filter Precision Automation Testing (R1)**
  - Single and multi-filter permutations testing
  - 99%+ accuracy and data integrity verification
  - Gate: Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor -> Gate Verdict
- [ ] **Phase 3: Milestone 2 - Keyword Master Engine & Volume Synchronization Testing (R2)**
  - Representative keywords (시장, 삼겹살, 메가커피, 제주도, 복합어)
  - Ranking integrity, 100% PC/Mobile/Total volume sync vs single keyword detail, 2nd hint extraction
  - Gate: Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor -> Gate Verdict
- [ ] **Phase 4: Milestone 3 - Quantitative Reporting & TROUBLESHOOTING.md Documentation (R3)**
  - Pass rate, accuracy %, edge case error metrics in quantitative tables
  - Full adherence to TROUBLESHOOTING.md guidelines
  - Gate: Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor -> Gate Verdict
- [ ] **Phase 5: Final E2E Suite Execution & Adversarial Hardening (Tiers 1-5)**
  - Verify 100% pass across all test tiers and produce final deliverable report
