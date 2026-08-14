# Bosses of RetroVault

A semi-serious bestiary of the bugs, regressions, deployment traps, and reality distortions we have fought while building RetroVault.

Part engineering folklore, part operator handoff, part future storytime material.

---

## How to read this document

Each boss includes:
- **Encounter**: what it looked like from the outside
- **True Form**: what was actually wrong
- **How We Beat It**: the fix or operational lesson
- **Loot Drop**: the durable improvement we got from surviving it

---

## The Workflow Wraith

**Encounter**
- Release fixes appeared correct locally, but GitHub kept running an older-looking workflow.
- Docker Hub publishing seemed missing even after release workflow edits.

**True Form**
- We were editing nested workflow files under `retrovault/.github/workflows`, while GitHub Actions was actually executing workflow files from repo root `.github/workflows`.

**How We Beat It**
- Confirmed the real git toplevel and the actual active workflow directory.
- Moved stable release ownership into the real root `release.yml`.
- Reduced the old tag-based publish workflow to manual-only so release responsibility stopped splitting.

**Loot Drop**
- Clear rule: always verify repo root and active Actions path before debugging workflow behavior.
- Stable release publishing now has one canonical owner.

---

## Branchmancer Defaultus

**Encounter**
- The Actions UI did not show the workflow we expected.
- Workflow names and current definitions felt out of sync with what was in the repo.

**True Form**
- GitHub default branch was not yet set to `prod`, which made the Actions UI feel misleading and stale.

**How We Beat It**
- Switched the default branch to `prod`.

**Loot Drop**
- Actions UI, workflow visibility, and release debugging became much easier to reason about.

---

## The PR Gatekeeper

**Encounter**
- “We pushed it” and “GitHub is using it” were not the same truth.
- Tags kept behaving as if workflow fixes were missing.

**True Form**
- Changes were landing in a PR-gated flow and had not always been merged to the branch GitHub was actually releasing from.

**How We Beat It**
- Confirmed approval and merge state instead of assuming push state equaled live state.
- Cut fresh tags only from actually merged commits.

**Loot Drop**
- New rule: before tagging, confirm the exact remote commit on the release branch is the one you mean to ship.

---

## Taggeist of Commits Past

**Encounter**
- Fresh reruns seemed to ignore workflow fixes.
- Old release behavior kept reappearing.

**True Form**
- Tags are pinned to specific commits, and each tagged commit carries the workflow definitions that existed at that exact point in history.

**How We Beat It**
- Stopped assuming reruns would pick up later workflow fixes.
- Cut new tags from newer commits whenever the release pipeline itself changed.

**Loot Drop**
- Durable release rule: workflow fixes require fresh tags, not just re-running older releases.

---

## Pathsplit Slime

**Encounter**
- A test wrote a JSON file successfully, then immediately failed to find it.

**True Form**
- The test assumed `process.cwd()/data`, while production code had moved to env-aware runtime data paths via `RETROVAULT_DATA_DIR`.

**How We Beat It**
- Updated the test to use the same runtime path helper as production code.

**Loot Drop**
- Another hybrid-storage drift vector removed.
- Stronger rule: tests should read/write through the same runtime path abstractions the app uses.

---

## Lockjaw, the SQLite Mimic

**Encounter**
- `storageCompat.test.ts` moved from missing-table failures to `database is locked` failures.

**True Form**
- The test was running `prisma migrate deploy` repeatedly while Prisma was also opening the SQLite file in-process.

**How We Beat It**
- Changed the test to migrate once per suite and reset state between tests instead of re-running migrations in every `beforeEach`.

**Loot Drop**
- More deterministic test setup.
- Better respect for SQLite’s one-goblin-at-a-time locking model.

---

## Prismaphantom

**Encounter**
- Docker build failed during `npm ci` with Prisma complaining the schema could not be found.

**True Form**
- `npm ci` in the Docker deps stage triggered package `postinstall`, which ran `prisma generate` before `prisma/schema.prisma` had been copied into the image.

**How We Beat It**
- Switched Docker deps install to `npm ci --ignore-scripts`.
- Kept Prisma generation in the builder stage after the repo contents were copied.

**Loot Drop**
- Cleaner Docker build contract.
- Prisma generation now runs in the correct stage with the files it actually needs.

---

## Node-Gyp Gremlin

**Encounter**
- Docker builds failed during dependency installation inside `node:22-slim`.

**True Form**
- Native dependencies, especially `better-sqlite3`, may require build tooling in slim images.

**How We Beat It**
- Installed `python3`, `make`, and `g++` in the Docker deps stage.

**Loot Drop**
- The container now has the native toolchain needed for SQLite-adjacent modules when prebuilt binaries are unavailable.

---

## Captain Frozen Lockfile

**Encounter**
- Docker install failed while using a package-manager incantation that looked plausible at a glance.

**True Form**
- `npm ci --frozen-lockfile` was the wrong spell. `--frozen-lockfile` belongs to other package manager ecosystems.

**How We Beat It**
- Replaced it with the correct npm usage.

**Loot Drop**
- Less cargo-cult package-manager syntax in the release path.

---

## Docker Hub Poltergeist

**Encounter**
- Build/push reached Docker Hub, then failed with `401 Unauthorized` and insufficient scopes.

**True Form**
- The Docker Hub token existed, but did not have enough permission to push to the target repository.

**How We Beat It**
- Corrected the token scopes.
- Preferred least privilege afterward: read/write is enough for the normal release path.

**Loot Drop**
- First verified stable Docker Hub mirror for RetroVault.
- Confirmed registry auth is now part of the real release pipeline, not a paper plan.

---

## The AUTHENTICATING Apparition

**Encounter**
- App shell got stuck on `AUTHENTICATING...` in ways that looked like auth bugs.

**True Form**
- Multiple incidents turned out to be runtime integrity problems, asset mismatches, or dev-origin issues rather than true authentication failures.

**How We Beat It**
- Added readiness and smoke checks that validate pages, APIs, and static assets.
- Treated `_next/static` failures as release/runtime integrity problems, not auth problems.

**Loot Drop**
- Safer deploy verification and less time lost blaming the wrong subsystem.

---

## The _next/static Shade

**Encounter**
- Browser-facing failures appeared partial or misleading, often with a live process but broken client runtime.

**True Form**
- Shared or stale build artifacts caused asset mismatches across environments.

**How We Beat It**
- Added runtime readiness gates and smoke tests.
- Moved toward per-environment isolation and worktree-aware runtime separation.

**Loot Drop**
- “PM2 says online” is no longer treated as enough.
- Readiness now means real HTTP + asset integrity.

---

## Split-Brain Wonder Boy

**Encounter**
- Copy-condition and ownership states could look inconsistent or misleading.

**True Form**
- Hybrid JSON/SQLite truth could drift, and ownership bucket logic was not mutually exclusive enough.

**How We Beat It**
- Fixed bucket logic to make ownership categories exclusive.
- Continued the compat/migration strategy so hybrid truth gets narrower over time.

**Loot Drop**
- Trustworthy detail views and another reminder that split-brain state always collects interest.

---

## The Duplicate Doppelgamer

**Encounter**
- Same title/platform could appear as duplicate inventory rows when a new generated id slipped in.

**True Form**
- Hybrid creation paths could key too heavily on id instead of normalized title/platform identity.

**How We Beat It**
- Added duplicate-safe matching and merge behavior based on normalized title/platform.

**Loot Drop**
- Better inventory trust and less accidental row duplication during live/add flows.

---

## PM2 CWD Chameleon

**Encounter**
- Worktree-isolated environments sometimes looked like they were running the right code while actually serving from the wrong checkout.

**True Form**
- PM2 reloads did not always rebind `cwd`/script metadata the way we expected.

**How We Beat It**
- Used delete/start behavior when needed instead of assuming reload would fully rebind.
- Verified the real app directories for each worktree/runtime.

**Loot Drop**
- More trustworthy environment isolation and fewer fake-parity wins.

---

## Hairpin DNS Hydra

**Encounter**
- Public-looking dev domains behaved differently inside the LAN than outside it.

**True Form**
- Split-horizon/hairpin DNS behavior created inconsistent resolution paths.

**How We Beat It**
- Fixed local DNS/Pi-hole behavior and verified internal resolution for the dev domains.

**Loot Drop**
- Reliable LAN access for externally named dev surfaces.

---

## Scraper Fog

**Encounter**
- Scraper failures or degradation felt confusing, noisy, or invisible.

**True Form**
- There was no generic, trustworthy surface for “something is degraded, but not everything is broken.”

**How We Beat It**
- Built generic scraper-health reporting and a restrained UI surface for actionable degradation.

**Loot Drop**
- Better user trust and a reusable health model beyond PriceCharting alone.

---

## Final Boss Cleared (for now): The Product Availability Gate

**Encounter**
- Product Availability was planned, documented, and half-real, but not yet proven across the public surfaces that matter.

**True Form**
- Release mechanics, registry publishing, repo presentation, default branch configuration, workflow ownership, Docker build validity, and token scopes all had to line up at once.

**How We Beat It**
- Fixed the release pipeline end to end.
- Verified GitHub Releases, GHCR publishing, and Docker Hub mirroring through a real successful release.

**Loot Drop**
- RetroVault is now present on GitHub Releases, GHCR, and Docker Hub through an actual working stable release path.
- First verified end-to-end public registry release: **`v2.1.41`**.

---

## Future Expansion: turn these into characters

Possible future formats:
- children’s-style cute monster cards
- codex / lore gallery inside Mission Control
- release retrospective illustrations
- “Bosses of RetroVault” printable one-pagers
- a bedtime-story version where the bugs are mischievous but beatable

If this ever becomes a real illustrated set, keep the energy:
- spooky but adorable
- specific enough to teach the lesson
- funny enough that the pain turns into folklore
