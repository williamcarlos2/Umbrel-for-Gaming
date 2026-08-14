# RetroVault — Release Process

> Documentation is part of the release artifact. If a release changes setup, storage, deployment, branching, or operator workflow, update the relevant docs in the same workstream before tagging.

RetroVault uses [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

| Type | When to use | Example |
|---|---|---|
| **PATCH** | Bug fixes, UI polish, test additions | `v2.0.1` |
| **MINOR** | New features, new pages, new scrapers | `v2.1.0` |
| **MAJOR** | Breaking changes, data migrations, architecture shifts | `v3.0.0` |

---

## How to cut a release

### 1. Update the changelog

Add an entry to `src/data/changelog.ts`:

```typescript
{
  version: "2.1.0",
  date: "2026-05-01",
  title: "What's new in this release",
  type: "feature",
  changes: [
    { category: "New Feature", items: ["Description of what changed"] }
  ]
}
```

### 2. Update package.json version

```bash
cd retrovault
# Edit version field in package.json
npm version minor  # or patch, major
```

### 3. Commit everything

For now, RetroVault is moving toward a 3-lane promotion model:
- `autopush` = active integration/dev lane
- `nightly` = stabilized pre-prod lane
- `prod` = production lane

Until the GitHub automation is fully wired, make release commits on the intended branch explicitly.

```bash
git add -A
git commit -m "🚀 Release v2.1.0 - Brief description"
git push origin prod
```

### 4. Tag the release

```bash
git tag v2.1.0
git push origin v2.1.0
```

The target release automation is:
- CI on branch pushes
- promotion from `autopush` -> `nightly`
- nightly GHCR image publish from the `nightly` lane
- manual promotion from `nightly` -> `prod`
- release tagging from `prod`
- stable GHCR image publish from tagged releases on `prod`

If that workflow is not yet fully present in the repo, treat this document as the intended operating model and verify branch, tests, and build manually before tagging.

### 5. Verify

Check `github.com/theretrovault/retrovault/releases` — the new release should appear within ~2 minutes.

For tagged releases, GitHub Actions now also publishes the container image to:
- GHCR
  - `ghcr.io/theretrovault/retrovault:latest`
  - `ghcr.io/theretrovault/retrovault:X.Y.Z`
  - `ghcr.io/theretrovault/retrovault:vX.Y.Z`
- Docker Hub (stable mirror)
  - `retrovault/retrovault:latest`
  - `retrovault/retrovault:X.Y.Z`
  - `retrovault/retrovault:vX.Y.Z`

For the `nightly` lane, GitHub Actions is intended to publish:
- `ghcr.io/theretrovault/retrovault:nightly`

As of the 2026-06-24 install proof, stable `v2.1.44` / `latest` tags are live and pullable from both GHCR and Docker Hub with matching digest `sha256:e8fe85f352c91070d66570cb4c288d13cf5d53d16269ffaee5d4e55426cdc366`; `nightly` returned `MANIFEST_UNKNOWN` and must stay an open release-channel verification item until the nightly workflow publishes a manifest.

After tagging or promoting nightly, verify:
- the expected GHCR image tags are present
- the expected Docker Hub stable tags are present for release tags
- stable GHCR and Docker Hub tags resolve to the same digest
- a disposable container starts and `/api/health` returns `status: ok`
- `nightly` does not overwrite `latest`

---

## Version history

| Version | Date | Highlights |
|---|---|---|
| `v2.0.0` | 2026-04-13 | Initial public release |

---

## Runtime snapshot safety

Before any production update that can mutate or rely on runtime state, create a restorable runtime snapshot.

Why this is broader than "back up the DB": RetroVault still has hybrid storage in active use, so rollback safety requires the full runtime state, not only SQLite.

Minimum operator flow:

```bash
npm run backup:runtime -- prod
bash scripts/deploy.sh prod prod
```

Restore flow:

```bash
npm run restore:runtime -- prod backups/runtime-data/prod-YYYY-MM-DDTHH-MM-SS-sssZ --dry-run
npm run restore:runtime -- prod backups/runtime-data/prod-YYYY-MM-DDTHH-MM-SS-sssZ --force
```

The dry run is intentional. Restore is a sharp tool and should preview what it will overwrite before touching live runtime state.

`deploy.sh` now performs the prod backup automatically before build/restart, but the explicit command is still useful for manual operator snapshots and self-hosted guidance.

## What makes a good release

- All tests passing
- `npm run build` succeeds
- Runtime snapshot taken before prod deploy or migration work
- Changelog updated with user-facing description
- No sensitive data in committed files
- Docker build test passes (if Dockerfile changed)
- GHCR publish succeeds for the release tag and produces the expected stable tags
- Relevant docs updated in the same workstream (`README.md`, `docs/architecture.md`, `docs/developer-guide.md`, `docs/installation.md`, `docs/releasing.md`, env/branching docs, or operator checklists as applicable)
- If storage/runtime behavior changed, docs explicitly note whether the app is still hybrid JSON/SQLite or fully migrated
