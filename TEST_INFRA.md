# E2E Test Infra: review-moa Automated Precision Testing

## Test Philosophy
- Opaque-box & White-box requirement-driven verification for review-moa integrated search engine and Keyword Master.
- Methodology: Category-Partition, Boundary Value Analysis (BVA), Pairwise Combinatorial Testing, Real-World Workload Testing, and Dual-Engine Parity Verification.
- Deterministic assertions with exact mathematical validation (100% volume match, 99%+ filter accuracy, 0 dummy data).

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Isolation) | Tier 2 (BVA/Corner) | Tier 3 (Combinations) | Tier 4 (Real-World) |
|---|---------|-------------|:------------------:|:-------------------:|:---------------------:|:-------------------:|
| F1 | Recruitment Type Filter (`type`) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F2 | Category 25-Type Filter (`category`) | ORIGINAL_REQUEST §R1 | 26 | 10 | ✓ | ✓ |
| F3 | Platform Filter (`platform`) | ORIGINAL_REQUEST §R1 | 6 | 5 | ✓ | ✓ |
| F4 | Region Sido & Sigungu Filter (`location`) | ORIGINAL_REQUEST §R1 | 25 | 15 | ✓ | ✓ |
| F5 | Multi-Filter Permutations & Data Loss Guard | ORIGINAL_REQUEST §R1 | 10 | 10 | 20 | 10 |
| F6 | Dual Query Engine Parity | ORIGINAL_REQUEST §R1 | 5 | 5 | 10 | 5 |
| F7 | Keyword Master Entity & Preset Engine | ORIGINAL_REQUEST §R2 | 10 | 5 | 5 | 5 |
| F8 | Keyword Ranking & Priority Integrity | ORIGINAL_REQUEST §R2 | 10 | 5 | 5 | 5 |
| F9 | Search Volume 100% Synchronization | ORIGINAL_REQUEST §R2 | 10 | 10 | 10 | 10 |
| F10 | 2nd Hint Collection Engine | ORIGINAL_REQUEST §R2 | 5 | 5 | 5 | 5 |

## Test Architecture
- **Runner**: `npx tsx <test_file.ts>`
- **Test Locations**:
  - `tests/e2e_search_filter.test.ts`: Exhaustive test harness for R1 (single filters, 25 categories, multi-filter combinations, dual-engine parity, 99%+ accuracy check).
  - `tests/e2e_keyword_master.test.ts`: Exhaustive test harness for R2 (다의어 '시장', 카테고리 '삼겹살', 브랜드 '메가커피', 지역 '제주도', 복합어 '강남 맛집', volume sync $PC+Mobile=Total$, 100% detail matching, 2nd hint extraction).
  - `tests/e2e_full_suite.ts`: Aggregated master runner with exit code 0 on 100% pass and JSON summary output.
- **Pass / Fail Criteria**:
  - Search filter accuracy $\ge 99.0\%$ on all valid test queries.
  - Keyword volume synchronization: $100.0\%$ match between batch list and single keyword detail inquiry.
  - Zero unhandled exceptions or crashes.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Food Blogger searching for Seoul Gangnam Visit Blog campaigns | F1, F2, F3, F4, F5 | High |
| 2 | Beauty Influencer looking for Nationwide Cosmetics Delivery campaigns | F1, F2, F3, F4, F5 | Medium |
| 3 | Travel Creator searching for Jeju Accommodation Clip/Instagram campaigns | F1, F2, F3, F4, F5 | High |
| 4 | Content Marketer researching Polysemous keyword '시장' for regional food markets | F7, F8, F9, F10 | High |
| 5 | Brand Strategist analyzing Franchise Coffee '메가커피' related keywords and competition | F7, F8, F9, F10 | High |
| 6 | Local Business optimizing for '제주도' and '강남 맛집' high-intent long-tail keywords | F7, F8, F9, F10 | High |

## Coverage Thresholds
- Tier 1: Feature Isolation Tests ($\ge 50$ test cases across all features)
- Tier 2: Boundary & Corner Cases ($\ge 30$ edge case permutations)
- Tier 3: Cross-Feature Combinations ($\ge 40$ multi-filter permutations)
- Tier 4: Real-World Scenarios ($\ge 10$ end-user workflow cases)
- Tier 5: Adversarial Hardening (white-box stress testing & defect discovery)
