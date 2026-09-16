# Source Parsing Contract

Each source uses an isolated list adapter. A list adapter must preserve only values published by the source; it must leave unavailable fields empty or zero rather than estimate them.

| Source | List route | Detail enrichment | Deadline source | Counts source |
| --- | --- | --- | --- | --- |
| 강남맛집 | AJAX list | optional modal refresh | list D-day | list/detail when published |
| 디너의여왕 | campaign list | benefit and mission | not publicly listed | detail when published |
| 포블로그 | session-backed API | detail refresh | list remaining days | list/detail |
| 리뷰노트 | official API | official API | API end time | API applicant and quota |
| 클라우드리뷰 | homepage | all current detail pages | detail `모집 기간` | detail `신청자 N/M` |
| 레뷰 | Weble API | API/detail | API date | API/detail |
| 미블 | public list | detail refresh | list D-day | unavailable unless published |
| 링블 | 4 categories × 5 pages | cached, 12-way detail requests | detail `모집 기간` | detail when published |
| 놀러와체험단 | public list | detail refresh | not publicly listed | unavailable unless published |
| 모블 | public list | detail refresh | not publicly listed | unavailable unless published |
| 아싸뷰 | current pages | detail refresh | not publicly listed | detail when published |
| 오마이블로그 | official API | official API | API end date | API when published |
| 리뷰플레이스 | public list | all current detail pages | detail `모집기간` | unavailable unless published |

`npm run test:live` validates every list adapter for direct URLs, IDs, titles, platforms, and published deadlines. Before changing a parser, run the source-specific live check and add a regression fixture for any new detail pattern. The scheduled full sync runs every ten minutes and uses the same adapters as on-demand search.

Do not turn missing values into future deadlines, fixed quotas, or estimated applicant counts. Remove old rows from a source when its current detail-backed list is authoritative and the old rows have no verifiable deadline.
