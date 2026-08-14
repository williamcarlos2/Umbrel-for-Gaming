# RetroVault — Developer Guide

Everything you need to go from zero to shipping a contribution.

> Documentation rule: when a change affects setup, runtime behavior, storage, deployment, release flow, architecture, or operator workflow, update the relevant docs in the same workstream before calling the change done.

---

## Table of Contents

1. [Repository Overview](#1-repository-overview)
2. [Local Development Setup](#2-local-development-setup)
3. [Project Architecture](#3-project-architecture)
4. [Data Layer](#4-data-layer)
5. [Running Tests](#5-running-tests)
6. [How CI/CD Works](#6-how-cicd-works)
7. [Cutting a Release](#7-cutting-a-release)
8. [Docker Development](#8-docker-development)
9. [Adding Features](#9-adding-features)
10. [Code Style Guide](#10-code-style-guide)
11. [Common Tasks Reference](#11-common-tasks-reference)

---

## 1. Repository Overview

```
retrovault/                  ← You are here (the app)
├── src/
│   ├── app/                 ← Next.js App Router pages (50+ routes)
│   │   ├── api/             ← REST API routes
│   │   └── [page]/          ← Page components
│   ├── components/          ← Shared React components
│   ├── data/                ← Static data (achievements, quotes, themes, etc.)
│   ├── hooks/               ← Custom React hooks
│   ├── lib/                 ← Server-side utilities (data.ts, apiAuth.ts, etc.)
│   └── types/               ← Shared TypeScript types (import from here!)
├── scripts/                 ← Node.js scraper + utility scripts
├── data/                    ← Runtime data (gitignored — your collection lives here)
│   └── sample/              ← Template files for new installs
├── docs/                    ← This guide and other documentation
├── __tests__/               ← Unit tests (116+ tests)
├── Dockerfile               ← Production Docker image
├── docker-compose.yml       ← Full stack Docker setup
├── .env.example             ← Environment variable template
└── ecosystem.config.js      ← pm2 process manager config
```

**Root of the git repo** (one level up) contains `.github/` workflows, community files, and the root README. The actual app lives entirely inside `retrovault/`.

---

## 2. Local Development Setup

### Prerequisites
- **Node.js 22+** (`node --version`)
- **Git**

### First-time setup

```bash
git clone https://github.com/theretrovault/retrovault.git
cd retrovault/retrovault

# Set up config (required)
cp data/sample/app.config.sample.json data/app.config.json

# Set up optional API keys
cp .env.example .env.local
# Edit .env.local — add YouTube API key, GitHub token, etc.

# Install dependencies
npm install

# Start dev server (hot reload, port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Dev fixture workflow (private, recommended for risky data work)

RetroVault currently has a hybrid storage model: some core surfaces are SQLite-backed, while others still read env-local JSON files. Because of that, risky storage/model work should start from a realistic dev copy of current prod data.

**Standing rule:**
- For risky data work (migrations, schema/storage refactors, API read/write changes, inventory/sales/watchlist/tag/config systems), refresh a private prod snapshot into dev before starting.
- For trivial UI-only work (styling, copy, layout tweaks), skip the refresh unless realism matters.

**Important:** prod-derived fixtures contain real private data and must stay out of git.

### Snapshot current prod into a private fixture

```bash
node scripts/snapshot-prod-to-fixture.mjs
```

This copies the current `data/prod/` runtime state into:

```bash
fixtures/prod-snapshot/
```

### Reseed dev from the private fixture

```bash
node scripts/seed-dev-from-fixture.mjs
```

This:
- backs up the current `data/dev/` files into `backups/`
- copies the fixture snapshot into `data/dev/`

### One-shot refresh: prod -> fixture -> dev

```bash
node scripts/refresh-dev-from-prod.mjs
```

Use this before risky data/model work so dev mirrors current prod behavior as closely as possible.

### Suggested workflow

1. `node scripts/refresh-dev-from-prod.mjs`
2. make the risky data/model change in dev
3. run tests + build
4. validate behavior against realistic dev data
5. take a runtime snapshot before prod promotion: `npm run backup:runtime -- prod`
6. only then consider promotion

### Environment variables

| Variable | Required | What it does |
|---|---|---|
| `YOUTUBE_API_KEY` | No | Enables in-modal game videos |
| `GITHUB_ISSUES_TOKEN` | No | Enables in-app bug reporting |
| `SESSION_SECRET` | No | Signs auth session cookies |

See `.env.example` for setup instructions per key.

---

## 3. Project Architecture

For the high-context system map, read [`docs/architecture.md`](architecture.md) first. This section is the shorter contributor-facing version.

### Tech stack
- **Next.js 16** (App Router) — pages, API routes, SSR
- **TypeScript** — strict mode, all files typed
- **Tailwind CSS** — utility-first styling
- **Recharts** — analytics charts
- **Vitest** — unit testing
- **pm2** — production process management

### Key patterns

**Pages** live in `src/app/[page]/page.tsx`. Client pages start with `"use client"`. Server pages (like the public collection view) are async components that read data directly.

**API routes** live in `src/app/api/[route]/route.ts`. All use `export const dynamic = 'force-dynamic'` and `Cache-Control: no-store` headers to prevent stale data.

**Shared types** are in `src/types/index.ts`. Always import from there — don't redefine `GameItem`, `Person`, etc. in individual files.

**Shared hooks** are in `src/hooks/`. Use `useInventory()`, `usePlayers()` (preferred for player/social data), `useCritics()` (legacy alias), and `usePriceData.ts` utilities rather than rolling your own fetch logic.

**Static data** (achievements, quotes, changelog, nav config, platform groups, themes, consoles) lives in `src/data/`. This is TypeScript, not JSON — it gets bundled and is never user-editable.

**Runtime data** (your collection, sales, config) lives in `data/` which is gitignored. It's read/written by API routes via `src/lib/data.ts`.

---

## 4. Data Layer

RetroVault uses **SQLite** as its primary database backend, with Prisma 7 as the ORM. All personal data lives in `data/` (gitignored — never committed).

### SQLite Database

Current env-aware layout:

| File | What it contains |
|---|---|
| `data/prod/retrovault.db` | Production SQLite database |
| `data/dev/retrovault.db` | Dev SQLite database |
| `data/nightly/retrovault.db` | Nightly SQLite database |

Legacy note: `data/retrovault.db` may still exist as the old pre-env split database and can be used as a migration source, but the target runtime layout is env-local.

The schema is defined in `prisma/schema.prisma`. Apply changes with:

```bash
# Apply schema migrations
npx prisma migrate dev --name your_change_name

# Regenerate Prisma client after schema changes
npx prisma generate
```

For risky storage conversion work, snapshot runtime state first. `scripts/migrate-to-sqlite.mjs` now does this automatically unless you pass `--dry-run` or `--skip-snapshot`. By default it targets `data/<env>/` using `RETROVAULT_ENV` (default `prod`) so it follows the same env split as the app runtime.

### Prisma Client

Use the singleton client from `src/lib/prisma.ts`:

```typescript
import prisma from '@/lib/prisma'

// Query examples
const owned = await prisma.game.findMany({ where: { copies: { some: {} } } })
const count = await prisma.game.count()
const game  = await prisma.game.findUnique({ where: { id } })
```

The singleton uses Prisma 7's adapter pattern with `@prisma/adapter-better-sqlite3`.

### JSON fallback files (legacy / config)

Some data is still read from JSON. During the env-separation transition, these files live under the active env directory (for example `data/prod/` or `data/dev/`) and coexist with SQLite-backed data.

| File | What it contains |
|---|---|
| `app.config.json` | App settings (theme, auth, platforms, API keys config) |
| `inventory.json` | Main collection/inventory dataset for current collection views |
| `favorites.json` | Players, favorites, regrets |
| `sales.json` | P&L ledger (sales + acquisitions) |
| `watchlist.json` | Target Radar price alerts |
| `goals.json` | Platform completion goals |
| `grails.json` | Holy Grail wish list |
| `playlog.json` | Play Log entries |
| `tags.json` | Game/platform tags + @mentions |
| `events.json` | Gaming events calendar |
| `whatnot.json` | Whatnot seller/stream tracking |
| `value-history.json` | Daily collection value snapshots |
| `achievements-unlocked.json` | Manually unlocked achievements |
| `scrapers.json` | Scraper registry and run status |
| `bug-reports.json` | Rate limiting state for bug reporter |

Important: as of the current release, RetroVault is still hybrid storage. Do not assume that moving SQLite data alone migrates the app completely. Several core views still depend on env-local JSON until the JSON→SQLite consolidation workstream is finished.

**Server-side data access:** Use `readDataFile()` and `writeDataFile()` from `src/lib/data.ts`:

```typescript
import { readDataFile, writeDataFile } from '@/lib/data';

const inventory = readDataFile<GameItem[]>('inventory.json', []);
writeDataFile('inventory.json', updatedInventory);
```

---

## 5. Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

RetroVault now has 140+ tests in `src/__tests__/` and the count keeps moving as focused regressions land. When adding a feature:
1. Write tests in `src/__tests__/yourfeature.test.ts`
2. Run `npm test` before committing
3. CI will also run them — PRs don't merge without green tests
4. If the change is user-visible or operational, update the relevant docs in the same workstream

### Test categories
- `pricecharting.test.ts` — price scraper regression tests (PAL filtering, slug generation, etc.)
- `achievements.test.ts` — achievement unlock logic
- `flipCalculator.test.ts` — fee math and ROI calculations
- `csvImport.test.ts` — CSV parser and platform normalization
- `apiAuth.test.ts` — API key validation, rate limiting
- `navTooltip.test.ts` — tooltip behavior invariants
- `addAssetModalPlatforms.test.ts` — Vault add-flow platform sourcing honors enabled runtime platforms
- `vaultWishlistFlow.test.ts` — Vault add can auto-satisfy wishlist entries, expose session undo, and respect the settings toggle
- `fieldPage.test.ts` — Field Mode UI regressions including Photo Lookup affordances, low-confidence flow, and mobile search behavior

---

## 6. How CI/CD Works

RetroVault now uses a multi-lane workflow model:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Pushes to `master`, `autopush`, `nightly`, `prod` and all PRs | Runs the full validation gate: install, env bootstrap, tests, build |
| `deploy-dev.yml` | Pushes to `autopush` or manual dispatch | Deploys the dev runtime over SSH using the `dev` GitHub environment |
| `promote-nightly.yml` | Pushes to `autopush` or manual dispatch | Validates `autopush`, fast-forwards `nightly`, then deploys nightly over SSH |
| `promote-prod.yml` | Manual dispatch | Validates `nightly`, fast-forwards `prod`, then deploys production over SSH |
| `release.yml` | Version tags like `v2.1.0` | Validates the tagged commit and creates a GitHub Release |

GitHub environment setup now matters for deploy workflows:
- `dev`
- `nightly`
- `production`

Recommended secret names:
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- optional `DEPLOY_PORT`

Recommended environment variable:
- `DEPLOY_APP_DIR`

**Branch protection:** During transition, `master` may still have the legacy protection/ruleset attached. The target model is to move the real protected-release posture to `prod`, keep `nightly` gated, and leave `autopush` as the fast integration lane.

---

## 7. Cutting a Release

When a batch of features is ready for a formal release:

### Step 1 — Update the changelog

Add an entry to `src/data/changelog.ts` **inside** the `CHANGELOG` array:

```typescript
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.1.0",
    date: "2026-05-01",
    title: "What's new in this release",
    type: "feature",  // "feature" | "fix" | "improvement" | "breaking"
    changes: [
      { category: "New Feature", items: ["What changed"] }
    ],
  },
  // ... existing entries
];
```

⚠️ **The entry must be inside the array.** Accidentally placing it outside breaks the TypeScript parser for the entire app.

### Step 2 — Bump version in package.json

```bash
# Edit manually or use:
npm version minor   # 2.0.x → 2.1.0
npm version patch   # 2.0.x → 2.0.x+1
npm version major   # 2.x.x → 3.0.0
```

### Step 3 — Commit and push

```bash
git add src/data/changelog.ts package.json
git commit -m "🚀 Release v2.1.0 — Brief description"
git push origin autopush
```

### Step 4 — Tag the release

```bash
git tag v2.1.0
git push origin v2.1.0
```

This automatically:
- Creates a GitHub Release at `github.com/theretrovault/retrovault/releases`
- Publishes the Docker image to `ghcr.io/theretrovault/retrovault:latest`
- Tags the image as `v2.1.0`, `v2.1`, and `v2`

---

## 8. Docker Development

### Running locally with Docker

```bash
# First run
mkdir -p ../retrovault-data
cp data/sample/app.config.sample.json ../retrovault-data/app.config.json
cp .env.example .env.local  # Optional: add API keys

# Start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Rebuilding after code changes

```bash
docker compose build
docker compose up -d
```

### Where data lives

Container mounts `./retrovault-data:/app/data` and `./retrovault-logs:/app/logs`. All your collection data persists in these local directories — it's never inside the container.

### Running scrapers in Docker

```bash
# One-off scraper run
docker compose run --rm price-fetcher

# Event scraper
docker compose run --rm event-scraper
```

For scheduled scraping in Docker, add host-level cron entries:
```cron
0 0 * * * docker compose -f /path/to/retrovault/docker-compose.yml run --rm price-fetcher
```

---

## 9. Adding Features

### New page

1. Create `src/app/yourpage/page.tsx`
2. Add to `src/data/navConfig.ts` under the appropriate feature group
3. If it has business logic, add tests in `src/__tests__/`
4. Add to `src/data/changelog.ts` when ready to release

### New API route

1. Create `src/app/api/yourroute/route.ts`
2. Add `export const dynamic = 'force-dynamic'`
3. Use `readDataFile` / `writeDataFile` from `src/lib/data.ts`
4. Consider adding a `/api/v1/yourroute` endpoint too for programmatic access

### New achievement

Add to `src/data/achievements.ts` in the `ACHIEVEMENTS` array:

```typescript
{ 
  id: "unique_id",           // snake_case, no duplicates
  name: "Display Name",
  icon: "🎮",
  category: "collection",    // see AchievementCategory type
  rarity: "common",          // common|uncommon|rare|epic|legendary
  points: 10,
  condition: "Human-readable unlock condition",
  check: c => c.totalOwned >= 10  // uses AchievementContext
}
```

Add context fields to `AchievementContext` if needed, then populate them in `src/app/api/achievements/route.ts`.

### Scheduler behavior

The in-process scheduler (`src/lib/scheduler.ts`) runs automatically when the Next.js server starts via `src/instrumentation.ts`. It uses `setInterval` to check every minute whether any enabled scraper should run based on its `cadenceType` and `cadenceHour`.

**Cadence types:**
- `hourly` — runs at minute 0, every N hours (`cadenceHour` = interval)
- `daily` — runs at minute 0, every day at `cadenceHour` 
- `weekly` — runs on Monday at `cadenceHour`
- `on-demand` — never auto-runs, only via "Run Now" button

**When user changes a schedule in the Scraper UI:**
1. `PUT /api/scrapers` with `action: update_cadence`
2. Saves to `data/scrapers.json`
3. Calls `reloadSchedules()` — takes effect within 60 seconds (next tick)
4. No server restart required

**Tests:** `src/__tests__/scheduler.test.ts` — covers all cadence types, disabled/on-demand invariants, exact fire counts per day/week.

### New scraper

1. Create `scripts/scrape-yourdata.mjs`
2. Throttle requests (2.5s minimum between requests)
3. Write output to `data/yourdata.json`
4. Log to `logs/yourdata.log`
5. Register in `data/scrapers.json`
6. Register its runtime schedule in the appropriate app scheduler/config path if it should run automatically

---

## 10. Code Style Guide

### TypeScript
- **No `any`** unless truly unavoidable — use `unknown` and narrow
- Import shared types from `@/types` — don't redefine `GameItem`, `Person`, etc.
- API routes return typed responses

### UI / Tailwind
- Use `font-terminal` class (VT323 monospace) for all body text
- Use `font-pixel` class (Press Start 2P) sparingly for headers
- Primary green: `text-green-400`, borders: `border-green-800`
- Dark backgrounds: `bg-zinc-950` (cards), `bg-black` (page sections)
- No hardcoded colors — use Tailwind classes so themes work

### Components
- Pages: `src/app/[page]/page.tsx`
- Shared UI: `src/components/`
- Business logic hooks: `src/hooks/`
- Static data: `src/data/`
- API utilities: `src/lib/`

### Commits
Follow the existing style:
- `🚀 Release v2.1.0 — description`
- `🔧 Fix: what was fixed`
- `✨ Add: new feature name`
- `📋 Docs: what was documented`
- `🧪 Tests: what was tested`
- `🔄 Auto-sync YYYY-MM-DD HH:MM — N changes`

---

## 11. Common Tasks Reference

| Task | Command |
|---|---|
| Start dev server | `npm run dev` |
| Production build | `npm run build` |
| Run tests | `npm test` |
| Watch tests | `npm run test:watch` |
| Snapshot runtime state | `npm run backup:runtime -- prod` |
| Preview runtime restore | `npm run restore:runtime -- prod backups/runtime-data/prod-... --dry-run` |
| Restore runtime snapshot | `npm run restore:runtime -- prod backups/runtime-data/prod-... --force` |
| Start with pm2 | `pm2 start ecosystem.config.js` |
| Reload pm2 | `pm2 reload retrovault --update-env` |
| Deploy update | `bash scripts/deploy.sh` |
| Fetch prices | `node scripts/bg-fetch.mjs` |
| Scrape events | `node scripts/scrape-events.mjs` |
| Value snapshot (manual) | `node scripts/snapshot-value.mjs` |
| JSON -> SQLite migration | `node scripts/migrate-to-sqlite.mjs` |
| Git sync (maintainer only) | `node scripts/git-sync.mjs` |
| Tag release | `git tag v2.x.x && git push origin v2.x.x` |
| Docker up | `docker compose up -d` |
| Docker rebuild | `docker compose build && docker compose up -d` |
| Docker logs | `docker compose logs -f` |
| View CI runs | `github.com/theretrovault/retrovault/actions` |
| View releases | `github.com/theretrovault/retrovault/releases` |
| Docker image | `ghcr.io/theretrovault/retrovault:latest` |

---

*Keep this guide up to date as the project evolves. When you add a significant feature, update the relevant section. When the release process changes, update Section 7.*
