# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 and TypeScript application. Routes and API handlers live in `src/app/`, with API endpoints under `src/app/api/`. Reusable UI belongs in `src/components/`. Core database, crawler, keyword, and detail-extraction logic is in `src/lib/`; source-specific collectors are in `src/lib/scrapers/search/`. Operational scripts live in `src/scripts/`, regression tests in `tests/regression/`, and deployment/source notes in `docs/` and `TROUBLESHOOTING.md`.

Read `TROUBLESHOOTING.md` before changing collection, synchronization, keyword metrics, or deadlines. It records prior production failures and required safeguards.

## Build, Test, and Development Commands

- `npm run dev` — start the local Next.js development server.
- `npm test` — run the `tsx` regression suite in `tests/regression/`.
- `npm run typecheck` — generate Next route types and run TypeScript without emitting files.
- `npm run build` — create the production build.
- `npm run lint` — run ESLint.
- `npm run test:live` — audit live source collectors; it requires network access and may fail when an upstream site is unavailable.

Run `npm test`, `npm run typecheck`, and `npm run build` before submitting crawler, API, or persistence changes.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, semicolons, and single quotes, matching existing files. Use `camelCase` for variables and functions, `PascalCase` for React components and types, and lowercase kebab-case for filenames except component files. Keep source-specific parsing isolated in its scraper module. Preserve source values: do not invent deadlines, counts, or fallback estimates. Use an empty string or explicit unavailable state when an upstream value is absent.

## Testing Guidelines

Add focused regression tests in `tests/regression/*.test.ts` for behavior that could affect filtering, expiry, synchronization, authentication, or keyword metrics. Name tests as complete behavior statements, for example: `expired campaigns retain their original deadline`. Mock external requests; reserve `test:live` for manual validation.

## Commit & Pull Request Guidelines

Use concise Conventional Commit-style subjects seen in this repository: `fix: restore trending synchronization` or `docs: document EC2 sqlite rebuild`. Keep each commit scoped to one outcome. Pull requests should explain the user-visible change, affected sources or APIs, validation commands, and any deployment or data-migration step. Include screenshots for UI changes and never commit `.env` files, API keys, SSH keys, or production SQLite data.
