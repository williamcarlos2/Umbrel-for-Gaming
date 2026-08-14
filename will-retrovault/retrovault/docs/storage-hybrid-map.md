# RetroVault Storage Hybrid Map

This document captures the current SQLite/JSON storage split so future storage work starts from the actual codebase instead of stale assumptions.

---

## Current truth

RetroVault is substantially SQLite-backed through Prisma, but it is still intentionally in a hybrid migration window.

Evidence in code:

- `prisma/schema.prisma` defines the primary SQLite schema.
- `src/lib/prisma.ts` creates the Prisma client with `better-sqlite3`.
- `src/lib/storageCompat.ts` is the compatibility boundary used by app/API surfaces.
- `src/lib/storageCompat.ts` explicitly says Prisma is preferred during the hybrid migration window, while JSON-only records can still exist and must not disappear.
- `src/__tests__/storageCompat.test.ts` includes coverage for preserving JSON-only inventory rows during that migration window.

Do not assume "SQLite exists" means "all runtime state is DB-only."

---

## SQLite-backed via Prisma

The current Prisma schema includes these models:

- `Game`
- `GameCopy`
- `PriceHistory`
- `Person`
- `Favorite`
- `Regret`
- `GameTag`
- `Mention`
- `Sale`
- `Acquisition`
- `WatchlistItem`
- `Grail`
- `PlayLogEntry`
- `CollectionGoal`
- `Event`
- `WhatnotSeller`
- `WhatnotStream`
- `ValueSnapshot`
- `WishlistItem`
- `WishlistShare`
- `CollectionShare`

These should be treated as the preferred durable data path where the corresponding compatibility methods exist.

---

## Hybrid compatibility surfaces

`src/lib/storageCompat.ts` exposes compatibility functions that often merge Prisma rows with legacy JSON files or preserve legacy fields during migration.

Major covered domains include:

- inventory
- watchlist
- favorites / regrets / people
- tags / mentions
- playlog
- goals
- grails
- sales / acquisitions
- events
- Whatnot sellers / streams
- value history

When changing one of these areas, inspect the relevant compatibility function first and update both the Prisma path and legacy compatibility behavior intentionally.

---

## JSON/runtime files still in active use or intentionally retained

Runtime JSON is still used for configuration, scheduler/config-like state, caches, and some compatibility paths. Observed runtime files include:

- `app.config.json` — app/operator configuration; intentionally JSON-backed today.
- `scrapers.json` — scraper registry/scheduler configuration; intentionally runtime-mounted JSON today.
- `inventory.json` — legacy/hybrid inventory compatibility.
- `sales.json` / `acquisitions.json` — legacy/hybrid sales and acquisition compatibility.
- `favorites.json` — legacy/hybrid people/favorites/regrets compatibility.
- `tags.json` — legacy/hybrid tags and mentions compatibility.
- `playlog.json` — legacy/hybrid playlog compatibility.
- `goals.json` — legacy/hybrid collection goals compatibility.
- `grails.json` — legacy/hybrid grail compatibility.
- `events.json` — legacy/hybrid event compatibility.
- `whatnot.json` — legacy/hybrid Whatnot compatibility.
- `value-history.json` — legacy/hybrid value snapshot compatibility.
- `achievements-unlocked.json` — runtime achievement unlock state.
- `bug-reports.json` — local bug-report/runtime state.
- `craigslist-deals.json` / `reddit-alerts.json` — deal/alert runtime files.
- `youtube-cache.json` — cache/runtime file.

Some of these should stay JSON because they are operator config, caches, or integration registry files. Others are candidates for finishing the migration.

---

## Migration classification

### Likely intentionally JSON for now

- `app.config.json`
- `scrapers.json`
- `youtube-cache.json`
- local integration/cache files where filesystem editing is part of the operator model

### Already DB-backed but still compatibility-sensitive

- inventory
- watchlist
- favorites/regrets/people
- tags/mentions
- playlog
- goals
- grails
- sales/acquisitions
- events
- Whatnot
- value history

### Needs focused investigation before removal of JSON fallback

- whether any live deployment still has JSON-only records not backfilled into SQLite
- whether import/migration scripts cover every legacy field used by UI/API code
- whether backup/restore expectations include both `retrovault.db` and JSON runtime files
- whether test fixtures still rely on JSON-only behavior

---

---

## Live deployment inventory — 2026-06-24

Read-only inventory from the Tower deployment at `/mnt/cache/appdata/retrovault/data` showed a much cleaner runtime than the compatibility map alone suggests:

- `retrovault.db` exists and was the only `*.db` / `*.sqlite*` / `*.json` file found under the deployed appdata directory at max depth 3.
- SQLite tables present include `Game`, `GameCopy`, `PriceHistory`, `Favorite`, `GameTag`, `PlayLogEntry`, `WatchlistItem`, `WishlistItem`, `CollectionGoal`, `Event`, `WhatnotSeller`, `WhatnotStream`, `ValueSnapshot`, and related Prisma migration tables.
- Verified live counts: `Game=27092`, `GameCopy=254`, `PriceHistory=237`.
- No live top-level JSON files were observed in the deployed appdata directory during this pass.

Interpretation:

- The current production appdata appears SQLite-only for persisted collection/runtime state at the inspected path.
- The codebase still contains JSON compatibility surfaces and fixture/sample files, so removing fallback behavior still requires tests and code-path review; do not delete compatibility paths solely because this deployment is clean.
- Next migration work should focus on proving whether any non-prod/dev appdata, fixtures, or import paths still rely on JSON-only records.

## Recommended next storage sprint

1. Generate a live inventory of runtime files in `data/prod`, `data/dev`, and deployed appdata.
2. For each JSON file, classify it as:
   - keep JSON intentionally
   - DB-backed with compatibility fallback
   - migration candidate
   - cache/derived artifact
3. For migration candidates, write tests first against `storageCompat.ts`.
4. Back up the runtime data directory before any data migration.
5. Run migration idempotently and verify counts/examples before removing JSON fallback.

---

## Practical rule

Do not delete a JSON fallback just because the Prisma model exists. Delete it only after proving:

- all live records are represented in SQLite;
- legacy-only fields are either migrated or intentionally dropped;
- tests cover the target behavior;
- backup/restore docs and scripts still match the runtime truth.
