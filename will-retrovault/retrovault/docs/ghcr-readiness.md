# RetroVault GHCR Readiness

This document defines what "ready" looks like for RetroVault on GitHub Container Registry (GHCR), what can be done without Alex, and which final platform actions still require Alex.

---

## Goal

Publish RetroVault as a trustworthy, predictable container on GHCR so users can pull it directly from GitHub's registry with stable tags and clear install guidance.

Canonical image target:
- `ghcr.io/theretrovault/retrovault`

---

## Desired tag model

Recommended tags:
- `latest` — current stable public release from `prod`
- `nightly` — current pre-prod lane from `nightly`
- `X.Y.Z` — immutable release tag
- `vX.Y.Z` — optional mirror tag if matching Git tag names is convenient

Recommended behavior:
- pushes to tagged prod releases publish stable semver tags
- nightly promotion can optionally publish `nightly`
- do not publish `latest` from active dev/autopush work unless explicitly intended

---

## What is already true

Current project context confirms GHCR is an active stable release surface; nightly is wired in workflow code but still needs a successful publish proof:
- docs reference `ghcr.io/theretrovault/retrovault:latest`
- Unraid template already points at GHCR
- `release.yml` now publishes stable GHCR tags on `v*` releases
- `publish-nightly-image.yml` is intended to publish `ghcr.io/theretrovault/retrovault:nightly` from the `nightly` lane, but the 2026-06-24 probe returned `MANIFEST_UNKNOWN` for `nightly`

---

## Readiness checklist

### Packaging / image expectations
- [x] image pull path is documented in README/release docs
- [x] tags are documented (`latest`, `nightly`, semver)
- [x] image has baseline OCI labels/metadata
- [ ] runtime env vars / volume expectations are documented
- [x] stable image can be verified with a simple pull + run/health path (`v2.1.44` and `latest` verified 2026-06-24)

### Workflow expectations
- [x] tagged releases build and publish stable image tags
- [x] nightly branch/promotion can publish `nightly` if desired
- [x] workflow avoids accidentally publishing unstable dev work as `latest`
- [x] image publishing success is visible in Actions logs/releases

### Trust / operator expectations
- [x] install docs show stable GHCR/Docker Hub pull/run examples
- [ ] upgrade path is documented
- [ ] backup/restore guidance is linked next to install/deploy guidance
- [x] stable package visibility is public (`v2.1.44` and `latest` verified via anonymous GHCR token flow 2026-06-24)

---

## Work I can do without Alex

- audit docs/README for GHCR references and consistency
- define recommended tag model and publishing rules
- prepare workflow recommendations for safer tag publishing
- prepare verification steps for container pull/install success
- align docs so GHCR is treated as a first-class distribution surface
- prepare the exact GitHub UI checklist and the GHCR implementation plan

---

## Work that needs Alex

- decide whether both `X.Y.Z` and `vX.Y.Z` tags should be published long-term, or only one style

---

## Recommended verification steps

### Pull test
```bash
docker pull ghcr.io/theretrovault/retrovault:latest
```

### Run test
Use the documented Docker Compose path from `docs/installation.md` and verify:
- app starts cleanly
- wizard or configured landing path loads
- persistent data volume path is clear
- upgrade path preserves runtime data

### Release verification
For a stable release:
- tag from `prod`
- confirm GitHub Release exists
- confirm GHCR package has the expected stable tags
- confirm install docs still match actual image/tag names

For a nightly publish:
- push/promote into `nightly`
- confirm GHCR package has the `nightly` tag
- confirm `latest` was not touched

---

## Recommended next step

Keep GHCR as the primary container registry surface. Stable tags are validated end-to-end; nightly remains open until the `nightly` manifest exists. Docker Hub is now a live stable mirror for discoverability and user habit. GHCR should remain the most GitHub-native and automation-friendly container home.

Companion docs:
- `docs/github-ui-checklist.md`
- `docs/ghcr-implementation-plan.md`


## Stable proof — 2026-06-24

Verified stable GHCR state without publishing a new release:

- `ghcr.io/theretrovault/retrovault:v2.1.44` and `latest` are public via anonymous token flow.
- Both stable tags resolve to digest `sha256:e8fe85f352c91070d66570cb4c288d13cf5d53d16269ffaee5d4e55426cdc366`.
- Docker Hub `retrovault/retrovault:v2.1.44` and `latest` resolve to the same digest and start successfully in a disposable container.
- `ghcr.io/theretrovault/retrovault:nightly` returned `MANIFEST_UNKNOWN`; keep nightly verification open until a nightly publish proves it.
