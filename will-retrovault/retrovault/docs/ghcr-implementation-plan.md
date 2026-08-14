# RetroVault GHCR Implementation Plan

This document covers the gap between current GHCR readiness docs and a real publish pipeline.

---

## Current truth

RetroVault now has dedicated GitHub Actions workflows for GHCR publishing.

Current workflows now do the following:
- `ci.yml` runs tests and build
- `release.yml` runs tests, build, smoke, publishes stable GHCR tags, and creates a GitHub release on `v*` tags
- `publish-nightly-image.yml` runs from `nightly`, validates the build, and publishes `ghcr.io/theretrovault/retrovault:nightly`
- deploy/promotion workflows handle SSH deploys and live smoke validation

What is still missing:
- live package visibility verification after an actual publish
- pull/run verification from the published image
- any additional nightly verification beyond successful Actions publish/logs

---

## Recommended publish model

### Stable publish source
- publish stable images from tagged releases on `prod`

### Recommended stable tags
- `latest`
- `X.Y.Z`
- optional `vX.Y.Z`

### Optional nightly publish source
- publish `nightly` from the `nightly` branch or promotion workflow

### Important rule
- do not publish `latest` from `autopush`

---

## Recommended workflow shape

### Stable release workflow
`release.yml` now:
1. checks out the repo
2. installs dependencies
3. prepares env data and applies Prisma migrations
4. runs tests, build, and release smoke checks
5. sets up Docker Buildx
6. logs in to GHCR with `GITHUB_TOKEN`
7. logs in to Docker Hub with `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN`
8. computes `latest`, `X.Y.Z`, and `vX.Y.Z` tags
9. builds and pushes the image to GHCR and Docker Hub
10. creates/updates the GitHub Release

The remaining release hardening step is external verification of the pushed image: package visibility, `docker pull`, run/health check, and tag parity.

### Nightly workflow
A separate workflow now:
1. runs only from `nightly`
2. publishes `ghcr.io/theretrovault/retrovault:nightly`
3. never updates `latest`

---

## Recommended Actions permissions

Likely needed for publish workflow:
- `contents: write` for release creation if bundled together
- `packages: write` for GHCR publish

---

## Recommended metadata

Image should include standard OCI labels such as:
- source repo URL
- project title
- project description
- license
- revision/commit SHA
- version/tag

---

## Recommended verification after publish

### Registry verification
- confirm package/tag is visible on GHCR
- confirm matching stable tags are visible on Docker Hub after tagged releases
- confirm tags match docs/release expectations

### Pull verification
```bash
docker pull ghcr.io/theretrovault/retrovault:latest
docker pull retrovault/retrovault:latest
```

### Run verification
Use documented compose/install path and verify:
- app boots
- health endpoint responds
- data volume expectations are clear
- upgrade path remains consistent

---

## Recommendation

Keep GHCR as the primary automated registry target. Docker Hub is now wired as a stable-release mirror, so the next milestone is proof: verify the first published stable tags from both registries and keep nightly GHCR-only unless intentionally expanded later. One clean cartridge before a second cartridge, because registry drift is a lousy boss battle.
