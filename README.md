# viral_re / 체험단 통합 검색

Next.js 16.3.5, React 19, TypeScript, SQLite, Axios/Cheerio and Playwright.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm start
```

The search page queries `/api/campaigns` with region, platform, recruitment type, category, source and sort filters. Results use server pagination (60 per page by default, maximum 300 per page). Search-triggered background crawling has a global concurrency limit and a three-minute keyword cooldown, including empty results.

`src/lib/crawler-parallel.ts` coordinates site collectors in `src/lib/scrapers/search/` with at most three sites in flight. Common parsing utilities live in `src/lib/scraper-utils.ts`. `crawler-core.ts` retains the bulk and legacy crawler entry points. Detail enrichment is centralized in `detail-service.ts`, with deduplication, bounded concurrency and caching.

`src/lib/db.ts` manages persistent SQLite and campaign-only serverless memory reads. `data/campaigns.json` is the single canonical seed snapshot. Expired deadlines remain unchanged and are excluded from active searches using Korea's calendar date. Unknown crawl deadlines are not fabricated. Known dates are retained when an update cannot determine a new deadline.

`src/lib/keyword-engine.ts` combines Naver APIs. Blog metrics are in `blog-stats.ts`. Unknown or censored search volumes, unavailable blog totals and unprovable monthly totals are represented as unavailable, never generated from unrelated metrics.

OAuth authorization, signed HTTP-only sessions and identity checks live in `auth.ts` and `oauth.ts`. The client cannot register a trusted session by submitting an ID. Mutation APIs fail closed when secrets are missing. Provider credentials are required to enable social login.

See [EC2 operation and verification](docs/operations/DEPLOYMENT.md) for environment configuration, release and rollback procedures. Older audit reports describe historical snapshots, not the current verified behavior or live source availability.
