# RetroVault — Architecture Overview

This is the high-context map for experienced developers who want to understand how RetroVault is wired today, what is transitional, and which architectural decisions are intentional.

## Why this document exists

RetroVault has moved beyond a single-runtime hobby app shape. It now has:
- multiple deployment environments
- env-local runtime state
- a hybrid SQLite + JSON storage model during migration
- promotion branches with different risk profiles
- local-only prod-derived fixture workflows for realistic development

The goal of this document is to help a reasonably experienced developer understand the system quickly without having to reverse-engineer decisions from scattered files.

## Current system shape

RetroVault is a Next.js App Router application with three major layers:

1. **UI layer**
   - pages in `src/app/`
   - shared components in `src/components/`
   - client/server rendering mixed depending on route needs

2. **Application/API layer**
   - API routes in `src/app/api/`
   - server-side helpers in `src/lib/`
   - most runtime reads/writes flow through helper utilities rather than direct file access in page components

3. **Runtime data layer**
   - env-local SQLite files
   - env-local JSON files still used by several surfaces
   - configuration and scraper state stored alongside other runtime data

## Environment model

RetroVault now uses a three-environment operating model.

| Environment | Branch | Purpose | Default port | Notes |
|---|---|---|---|---|
| `dev` | `autopush` | rapid iteration, demos, experiments | `3001` | may be intentionally noisy or unstable |
| `nightly` | `nightly` | stabilized preview | `3002` | intended for broader validation before prod |
| `prod` | `prod` | production release | `3000` | treated as the protected runtime |

Important: branch separation alone is not enough. The runtime must also be separated by data paths, process names, ports, and hostnames.

## Runtime path model

The core helper for env-aware runtime behavior is:
- `src/lib/runtimePaths.ts`

This module centralizes where the app reads and writes env-local runtime state.

Current runtime contract:
- SQLite DB: `data/<env>/retrovault.db`
- app config: `data/<env>/app.config.json`
- scrapers state: `data/<env>/scrapers.json`

This exists to prevent fake environment separation. If two runtimes share mutable state, they are not meaningfully separate.

## Storage model: currently hybrid

RetroVault is **not yet fully SQLite-backed**.

That is one of the most important facts for future developers.

### SQLite-backed direction

The long-term direction is Prisma + SQLite as the main persistence model.

Key files:
- `prisma/schema.prisma`
- `src/lib/prisma.ts`

### JSON-backed reality

Several important surfaces still rely on env-local JSON files. This includes core collection behavior and related app state during the migration period.

Examples include files such as:
- `app.config.json`
- `scrapers.json`
- `achievements-unlocked.json`

Recently migrated behind compatibility-preserving APIs:
- inventory reads/writes now flow through Prisma/SQLite via `/api/inventory`
- watchlist reads/writes now flow through Prisma/SQLite via `/api/sales?type=watchlist`
- collection public-share token persistence now flows through Prisma/SQLite via `/api/collection-share`, and `/public/[token]` now reads inventory through compat helpers instead of raw `inventory.json`

That means some user-facing surfaces already behave like the old JSON shape while persisting through SQLite under the hood.

### Why this matters

A SQLite restore alone does not necessarily restore full app behavior.

That was proven in production during the env-split cutover: restoring the DB did not restore the visible collection because collection views still depended on env-local `inventory.json`.

If you change storage behavior, verify the actual read path before assuming a given screen is already DB-backed.

## Why the hybrid state still exists

This was an intentional migration strategy, not random drift.

Why:
- keep the app usable while storage migration happens in chunks
- avoid high-risk all-at-once rewrites on production behavior
- preserve existing user-visible behavior while introducing env-local separation first
- allow dev/prod data isolation before full model consolidation

Current doctrine:
- for risky data/model work, refresh dev from a private prod-derived fixture first
- make the change live on dev first, validate there, then decide on nightly/prod promotion
- back up prod runtime data before every prod deploy so rollback and stabilization stay possible
- keep a reusable runtime-data backup path for self-hosted operators, not just our hosted prod flow
- treat restore as an explicit, preview-first recovery tool, not a casual convenience command
- migrate JSON-backed surfaces in controlled chunks with tests
- do not assume “Prisma exists” means “migration is done”

## Fixture paradigm for risky data work

Prod-derived fixture data is intentionally local-only.

Scripts:
- `scripts/snapshot-prod-to-fixture.mjs`
- `scripts/seed-dev-from-fixture.mjs`
- `scripts/refresh-dev-from-prod.mjs`

Purpose:
- snapshot current `data/prod/` into a private fixture
- reseed `data/dev/` from that snapshot
- let risky migrations and storage changes be validated against realistic data

Rules:
- fixture data must stay out of git
- `fixtures/` is ignored on purpose
- use this workflow before migrations, storage refactors, or risky API data-path changes
- trivial UI work usually does not need a refresh

## What is tracked in git vs local-only

### Tracked in git
- application code in `src/`
- schema and migration logic
- scripts in `scripts/`
- docs in `docs/`
- workflow definitions in `.github/workflows/`
- sample/template runtime files under `data/sample/`
- static bundled data under `src/data/`

### Never commit
- live runtime data under `data/`
- prod-derived fixtures under `fixtures/`
- secrets in `.env.local`
- environment-specific local state and backups

Practical rule: if it is user data, operator state, real config, or prod-derived fixture content, it should not go into git.

## Process and deployment model

### PM2

The main PM2 layout is defined in:
- `ecosystem.config.js`

Current process names:
- `retrovault-dev`
- `retrovault-nightly`
- `retrovault-prod`

This reduces operator mistakes and keeps process-level separation visible.

### Deploy flow

The intended promotion flow is:
- `autopush` -> `dev`
- `autopush` -> `nightly` via promotion workflow
- `nightly` -> `prod` via manual promotion workflow

Important docs:
- `docs/branching-and-environments.md` for promotion/runtime policy and rollout shape
- `docs/github-setup-checklist.md` for GitHub-side cutover steps
- `docs/github-admin-next-steps.md` for current admin migration context
- `docs/releasing.md` for release procedure

## Key architecture decisions and why

### 1. Three-lane branch model

Decision:
- use `autopush`, `nightly`, and `prod`

Why:
- separate fast iteration from preview validation and real production release
- reduce accidental production changes
- make demos and operational testing safer

### 2. Environment-local runtime state

Decision:
- each environment gets its own DB/config/scraper paths

Why:
- branch separation is fake if mutable runtime state is shared
- dev experimentation must not mutate prod state accidentally

### 3. Hybrid migration instead of big-bang rewrite

Decision:
- migrate JSON-backed surfaces to SQLite in chunks

Why:
- lower operational risk
- easier testing
- less chance of breaking collection-critical workflows all at once

### 4. Prod-derived fixture workflow

Decision:
- keep a local-only prod snapshot -> dev reseed workflow

Why:
- risky storage work needs realistic data
- synthetic data can hide migration bugs
- prod data must still stay out of git

### 5. Visible runtime labeling in UI

Decision:
- show the runtime environment in the app shell/footer

Why:
- operators and demo users can otherwise confuse dev and prod
- environment confusion is a classic footgun

### 6. Backup-first prod operations

Decision:
- treat prod as a delicate system and prefer copy-first recovery

Why:
- prod incidents are cheaper to recover from when the old state still exists
- env-split and hybrid-storage work increase the risk of wrong-path assumptions

## Code comments philosophy

RetroVault should prefer comments that explain:
- why a weird-looking thing exists
- what hidden coupling or migration rule matters
- what assumption will break future work if changed casually
- what framework/runtime workaround is intentional

RetroVault should avoid comments that just narrate obvious code.

The target is enough context for an experienced developer to understand intent without turning the codebase into a transcript of itself.

## Known transitional caveats

- The app is still hybrid JSON + SQLite.
- Some older docs/examples may still mention `master` during the branch transition.
- GitHub-side branch/ruleset/environment setup is partially scaffolded in repo but still requires admin-side completion.
- Dev exposure automation exists as a policy target but the 48-hour auto-shutdown mechanism is still pending.
- Some non-blocking Next metadata/Turbopack warnings still exist.
- Share identity/display settings like owner/contact/public URL still live in env-local config, while collection-share token/expiry state now lives in SQLite.

## Where to look next

If you are onboarding and want the shortest useful path:

1. read this file
2. read `docs/developer-guide.md`
3. read `docs/branching-and-environments.md`
4. inspect `src/lib/runtimePaths.ts`
5. inspect `src/lib/prisma.ts`
6. inspect the specific API route or page you plan to change

If you are touching storage/runtime behavior, also inspect the real read/write paths before assuming a surface has already been migrated.
