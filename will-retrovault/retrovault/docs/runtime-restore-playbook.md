# RetroVault Runtime Restore Playbook

Use this when a deploy, migration, or runtime-state bug leaves the app inconsistent and you need to stabilize quickly.

## Core rule

Do not treat restore as a casual convenience command.

A runtime restore can overwrite newer inventory, config, scraper state, or SQLite data. Always preview first, then restore only when you are confident the snapshot represents the state you want to return to.

## What a runtime snapshot contains

A runtime snapshot is broader than a DB backup. It can include:
- `retrovault.db` and SQLite sidecar files
- `app.config.json`
- hybrid JSON state like `inventory.json`, `sales.json`, `watchlist.json`, `favorites.json`, `tags.json`, `events.json`, and related runtime files
- scraper/runtime metadata

This matters because RetroVault is still in a hybrid-storage phase. Restoring only SQLite may not restore full app behavior.

## Before a risky change

Recommended:

```bash
npm run backup:runtime -- prod
```

For production deploys via `scripts/deploy.sh`, this now happens automatically before the build/restart path.

## Preview a restore

Always run a dry run first:

```bash
npm run restore:runtime -- prod backups/runtime-data/prod-YYYY-MM-DDTHH-MM-SS-sssZ --dry-run
```

This shows:
- which snapshot is being used
- the target env directory
- how many files are in the snapshot
- how many existing files would be overwritten
- per-file create vs overwrite behavior

## Perform a restore

Only after previewing:

```bash
npm run restore:runtime -- prod backups/runtime-data/prod-YYYY-MM-DDTHH-MM-SS-sssZ --force
```

## Recommended incident flow

1. Confirm the symptom
   - is it a bad deploy, bad data path, stale asset issue, or actual data mutation?
2. Capture the current state before changing anything else
   - `npm run backup:runtime -- prod`
3. Preview the intended restore snapshot
   - `npm run restore:runtime -- prod <snapshot-dir> --dry-run`
4. Decide whether restore is actually the right move
   - if the issue is code-only, a redeploy may be safer than restore
   - if only one storage path is stale, prefer a targeted fix over whole-env rollback
5. If restore is justified, run with `--force`
6. Restart the runtime if needed
7. Run smoke tests and verify user-facing routes

## When NOT to restore

Do not restore just because a record looks missing in the UI.

First check whether:
- the record still exists in JSON or SQLite
- a hybrid compat layer is hiding it
- a filter/search/view is excluding it
- a stale asset or bad client boot is masking good data

The Wonder Boy incident is a perfect example: the record still existed in JSON, but the compat read path surfaced only the incomplete SQLite side.

## Goal

Restore is for stabilization, not guesswork.

The safest operator move is usually:
- snapshot first
- preview restore
- restore only deliberately
- verify immediately after
