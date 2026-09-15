# EC2 operation and verification

The production app is a single PM2 process behind Nginx. Code releases are built in separate directories; `DATA_DIR` points to the persistent database directory. Never run `npm ci` or replace `.next` underneath the running release.

## Configuration

Keep secrets outside Git, in a mode-0600 environment file linked as `.env.production` in each release.

- `APP_ORIGIN`: canonical HTTPS origin, currently `https://viral-re.co.kr`.
- `DATA_DIR`: persistent data directory containing `review-moa.db` and the optional seed `campaigns.json`.
- `SESSION_SECRET`: random secret with at least 32 characters.
- `CRAWL_SECRET_KEY`, `SYNC_SECRET_KEY`: independently generated API credentials. Missing credentials disable the corresponding mutation endpoint. `CRON_SECRET` can serve as a shared fallback.
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (similarly `NAVER_OAUTH_*`, `KAKAO_OAUTH_*`): server-side OAuth app credentials. Register `${APP_ORIGIN}/api/auth/callback/<provider>` at each provider. Missing provider credentials return an unavailable message; there is no mock-login fallback. Instagram is currently unavailable.
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`: blog search API credentials, separate from Naver OAuth.
- `NAVER_SEARCHAD_CUSTOMER_ID`, `NAVER_SEARCHAD_API_KEY`, `NAVER_SEARCHAD_SECRET_KEY`: keyword search-volume credentials.
- `SYNC_TARGET_URL`: optional explicit sync destination. Without this value there is no EC2-to-Vercel push. If enabled, the destination must share the configured sync key. Pushes use authenticated batches of at most 500.
- `WRITE_CAMPAIGN_SNAPSHOT=true`: opt-in atomic snapshot export after successful campaign writes (only when more than 1,000 rows exist). Default off; use database backups for persistence.

OAuth users and bookmarks require persistent SQLite. Memory snapshots are suitable only for campaign reads and instance-local updates; they are not durable multi-instance synchronization.

## Release procedure

1. Run `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, and `npm audit` locally.
2. Back up SQLite with its backup API, the runtime snapshot, running PM2 definition, commit ID, and `.next` directory. Protect the PM2 backup because it may contain environment secrets.
3. Commit and push the reviewed change. Fast-forward the EC2 checkout, preserving locally modified data and unrelated files.
4. Export that commit into a new release directory, link the production environment file, install dependencies and build. On the 1 GB instance use `NODE_OPTIONS=--max-old-space-size=512 npm run build -- --webpack`.
5. Start a canary on an unused localhost port against the persistent database. Check the home page, paginated search, unauthorized mutation responses, and missing-provider behavior.
6. Switch PM2 `viral-re` to the new release, verify HTTPS through Nginx, and save the PM2 configuration. Keep the previous code, dependencies, and backup for rollback.

Do not restore old future-shifting logic as a data repair. For historical deadline correction, use a known snapshot only when the live row has not been crawled more recently; compare both its prior deadline and update timestamp before updating. Never overwrite new crawls with an older snapshot.

## Verification commands

- `npm test`: deterministic isolated regression tests; no production DB or live site requests.
- `npm run typecheck`: route type generation and strict TypeScript checking.
- `npm run build`: production build.
- `npm run test:live`: opt-in external site audit. Network failures and detected defects produce a failing exit status.
- `npm run lint`: full legacy codebase lint. Existing broad lint debt is tracked separately; it must not be confused with a successful build or regression run.

Search responses provide `totalCount`, `limit`, `offset`, and nullable `nextOffset`. Supply `crawl=false` for read-only health checks. `totalCount` is the complete filtered count, not the page size. Keywords with unavailable metrics return `null` and an unknown grade; a censored `<10` value is not converted into a made-up exact number.
