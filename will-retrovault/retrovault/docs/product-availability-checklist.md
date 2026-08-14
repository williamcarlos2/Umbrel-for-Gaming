# RetroVault Product Availability Checklist

This checklist is the execution companion to `docs/product-availability-phase-1.md`.

Use it to move RetroVault onto the usual public/distribution surfaces without mixing that work into feature backlog.

---

## Phase 1 goal

Make RetroVault:
- easy to find
- easy to install
- easy to trust
- easy to join/support

Primary Phase 1 surfaces:
- GitHub
- GHCR as the primary public registry
- Docker Hub as a stable-release convenience mirror
- docs
- landing-page messaging assets
- GitHub-first community/support entrypoints

---

## A. Work that can be completed without Alex

### A1. GitHub public-surface polish
- [x] Audit README/docs structure for product-availability gaps
- [x] Create GitHub public-surface recommendation doc
- [x] Create reusable public copy pack
- [ ] Audit README for:
  - [ ] clear one-line value prop
  - [ ] install options near the top
  - [ ] support/community links
  - [ ] release/distribution links
  - [ ] screenshots / image placeholders / media plan
- [ ] Prepare recommended GitHub About text
- [ ] Prepare recommended short repo description
- [ ] Draft release-note template for future public releases
- [ ] Draft support/discussion guidance for docs

### A2. GHCR readiness
- [x] Create GHCR readiness doc
- [x] Audit current GitHub Actions/release/deploy workflow posture at a planning level
- [x] Audit current GitHub Actions workflows for container publish behavior
- [x] Document desired image tags:
  - [x] `latest`
  - [x] `nightly`
  - [x] version tags (`vX.Y.Z` and `X.Y.Z`)
- [x] Document desired image metadata/labels
- [x] Document pull/run verification steps
- [x] Note any multi-arch gaps (`amd64`, `arm64`)

### A3. Docker Hub readiness
- [x] Create Docker Hub readiness doc
- [x] Create Docker Hub publish requirements handoff doc
- [x] Draft Docker Hub repo description
- [x] Draft Docker Hub long description / README copy
- [x] Define desired tag mapping vs GHCR
- [x] Document CI push requirements and token/secrets needed
- [x] Document post-publish verification steps

### A4. Docs readiness
- [x] Ensure install docs are adequate for public discovery traffic
- [ ] Ensure upgrade path is documented
- [ ] Ensure backup/restore docs are clearly linked
- [x] Ensure release-channel model is documented (`autopush`, `nightly`, `prod`)
- [x] Add product-availability docs to the discoverable docs set

### A5. Messaging assets
- [ ] Draft homepage hero copy
- [ ] Draft short description variants for:
  - [ ] GitHub
  - [ ] Docker Hub
  - [ ] directory/listing sites
  - [ ] social profiles
- [ ] Draft “Why RetroVault” paragraph
- [ ] Draft community/support call-to-action copy

### A6. Discord/community readiness
- [x] Create Discord/community recommendation doc
- [ ] Recommend public Discord structure
- [ ] Draft suggested channels and purpose of each
- [ ] Draft welcome/onboarding copy
- [ ] Draft announcements/support expectations copy

---

## B. Work that needs Alex

### B1. Platform ownership / decisions
- [x] Confirm official Docker Hub org/repo target as `retrovault/retrovault`
- [x] Confirm that dedicated landing page/domain is later, not Phase 1
- [x] Confirm community remains GitHub-first in Phase 1
- [ ] Confirm official public domain / landing-page domain later when backlog item activates
- [ ] Confirm official public Discord server/invite later if community expands beyond GitHub-first support

### B2. GitHub settings / platform actions
- [ ] Make GHCR package public if still private
- [ ] Update GitHub About section / website / social preview
- [x] Decide that GitHub Discussions should be enabled and public-facing
- [ ] Confirm Docker Hub secrets are present and valid for the first tagged release

### B3. Public-facing assets / approval
- [x] Approve tagline direction as "A self-hosted command center for retro game collectors."
- [x] Defer screenshots to Phase 2
- [ ] Approve public links to promote when GHCR visibility / GitHub settings are finalized

---

## Recommended execution order

### Wave 1: self-serve prep
1. Product availability planning docs
2. README/docs polish recommendations
3. GHCR audit
4. Docker Hub readiness checklist
5. messaging drafts
6. Discord structure recommendation

### Wave 2: Alex unblockers
1. GHCR visibility + GitHub About/discussions settings
2. Docker Hub credentials/secret validation when the first stable mirror release is published
3. landing domain decision later from backlog
4. screenshots/public media in Phase 2

### Wave 3: go live
1. publish/verify GHCR cleanly
2. publish/verify Docker Hub stable mirror
3. update GitHub public surface
4. publish docs/support/community links
5. verify discoverability/install path end-to-end

---

## Exit criteria for Phase 1

Phase 1 is complete when:
- [ ] GitHub clearly presents RetroVault as a polished public project
- [ ] GHCR path is documented and trustworthy
- [ ] Docker Hub path is ready or live
- [ ] docs support install, upgrade, backup/restore, and release-channel questions
- [ ] community entrypoint is defined
- [ ] remaining user-dependent steps are explicit, small, and actionable

---

## Current codebase audit — 2026-06-23

Current repository workflows show that container publishing is now implemented, not merely planned:

- `.github/workflows/release.yml` publishes stable tagged releases to GHCR and Docker Hub.
- `.github/workflows/publish-nightly-image.yml` publishes `ghcr.io/theretrovault/retrovault:nightly` from the `nightly` branch.
- Stable tags are `latest`, `X.Y.Z`, and `vX.Y.Z`.
- Docker Hub stable mirror target is `retrovault/retrovault`.

Still open before declaring Phase 1 complete:

- verify GHCR package visibility and pull/run behavior from an actually published tag; **stable `v2.1.44` / `latest` verified 2026-06-24; `nightly` still open**;
- verify Docker Hub credentials and tag parity during the first stable mirror release; **stable GHCR/Docker Hub digest parity verified for `v2.1.44` / `latest` 2026-06-24**;
- keep README/install/release docs aligned with the registry truth;
- complete GitHub About/social/support polish and remaining platform settings.

## Install-path proof — 2026-06-24

Verified without publishing a new release:

- Docker Hub repository `retrovault/retrovault` is public and active.
- Docker Hub tags include `latest`, `v2.1.44`, `2.1.44`, `v2.1.43`, `2.1.43`, `v2.1.42`, `2.1.42`, `v2.1.41`, and `2.1.41`.
- GHCR manifests for `ghcr.io/theretrovault/retrovault:v2.1.44` and `latest` are public via anonymous token flow.
- Stable GHCR and Docker Hub `v2.1.44` / `latest` resolve to matching digest `sha256:e8fe85f352c91070d66570cb4c288d13cf5d53d16269ffaee5d4e55426cdc366`.
- A disposable Docker Hub `retrovault/retrovault:v2.1.44` container started successfully with `RETROVAULT_SCHEDULER_ENABLED=false` and returned `/api/health` with `status: ok`.

Open after proof:

- `ghcr.io/theretrovault/retrovault:nightly` returned `MANIFEST_UNKNOWN`; keep nightly as open until a nightly branch publish proves it.
- Current published image manifests show `linux/amd64` plus an `unknown` attestation entry; no `linux/arm64` image was observed.
- GitHub About/social/support/community polish remains a platform/content task, not a registry blocker.
