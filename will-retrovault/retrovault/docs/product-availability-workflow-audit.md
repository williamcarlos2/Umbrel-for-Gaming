# RetroVault Product Availability Workflow Audit

This audit evaluates the current repo/workflow state against Product Availability Phase 1 needs.

---

## Summary

RetroVault is partway to Phase 1 readiness already, but the public distribution story is still stronger in docs than in fully-wired registry automation.

Current state:
- GitHub is already the public source of truth
- release / CI / deploy workflows exist
- GHCR is referenced in docs and templates
- Docker Hub is represented as a live stable publish path for tagged releases
- community/support surfaces are partially documented but not yet fully formalized as a product-availability lane

---

## 1. GitHub public surface

### Current strengths
- Public repo metadata exists in `package.json`
- README is substantial and already explains product value well
- install docs, developer docs, release docs, and architecture docs all exist
- Issues/Discussions are referenced in docs

### Current gaps
- Product Availability links were previously not surfaced clearly from the README/docs index until this new pass
- public distribution surfaces (GHCR primary, Docker Hub stable mirror) need to stay aligned with proven install-path evidence
- screenshots/media are still implied rather than formalized as a public-surface asset set
- GitHub About/social-preview/discussion settings still need manual platform confirmation

### Assessment
Status: **Mostly ready, pending final public-surface polish + Alex platform settings**

---

## 2. GHCR readiness

### Current strengths
- GHCR image path is already referenced in docs and Unraid template
- release workflow exists and is stable enough to support future container-publish integration
- GitHub is the natural canonical home for GHCR-backed distribution

### Current gaps
- no explicit GHCR publish workflow was confirmed in the current Phase 1 audit pass
- package visibility may still require GitHub UI action
- stable tag strategy is verified for `v2.1.44` / `latest`; nightly still needs manifest proof
- multi-arch expectations were not confirmed in current workflows

### Assessment
Status: **Conceptually ready, operationally needs workflow verification and likely some GitHub UI action**

---

## 3. Docker Hub readiness

### Current strengths
- Docker install path is already central to the project
- container-friendly docs already exist
- good candidate for a convenience mirror once GHCR path is locked in

### Current gaps
- no Docker Hub publish workflow is currently represented in the audited workflows
- no confirmed official Docker Hub namespace/repo yet
- no Docker Hub token/secrets can be assumed yet

### Assessment
Status: **Operational for stable tags; nightly still unproven**

---

## 4. Release / CI workflow fit for availability goals

### Confirmed current workflows
- `ci.yml`
  - tests + build on `master`, `autopush`, `nightly`, `prod`, PRs
- `release.yml`
  - tests + build + smoke + GitHub Release on `v*` tags
- `deploy-dev.yml`
  - deploys `autopush` to dev over SSH and runs public smoke
- `promote-nightly.yml`
  - validates autopush, fast-forwards nightly, deploys nightly, runs public smoke
- `promote-prod.yml`
  - validates nightly, fast-forwards prod, deploys prod, runs public smoke

### What this means for availability
The release/deploy discipline is stronger than many early-stage OSS tools already. The missing piece is not "do we have workflows at all". The missing piece is making container/distribution outputs first-class public artifacts alongside GitHub releases.

### Assessment
Status: **Strong foundation, distribution artifact story needs finishing**

---

## 5. Community/support readiness

### Current strengths
- GitHub Issues and Discussions are already referenced in docs
- bug-reporting paths exist in-app and in docs
- support posture is already fairly operator-friendly

### Current gaps
- no clearly documented official public Discord/invite yet
- GitHub Discussions role vs Discord role still needs explicit Alex decision
- support/community copy is now drafted, but not yet tied to a confirmed public community surface

### Assessment
Status: **Ready for activation once Alex confirms the public surface**

---

## 6. Recommended immediate next actions

### Can continue without Alex
1. README/GitHub copy tightening
2. add a specific "What still needs Alex" handoff doc
3. prepare Docker Hub workflow requirements doc
4. prepare GitHub About / short-description / tagline copy bundle

### Needs Alex soon
1. confirm Docker Hub namespace/repo
2. confirm Discord public/invite plan
3. make GHCR package public if still private
4. confirm whether GitHub Discussions should be publicly emphasized
5. approve screenshots/public asset set

---

## Bottom line

RetroVault is no longer at the "we should probably think about distribution later" stage.

It already has enough structure that Product Availability Phase 1 is mostly an exercise in:
- clarifying the public surface
- wiring container distribution cleanly
- confirming a few platform/account decisions
- making GitHub/docs/community feel intentional instead of incidental


## Stable registry proof — 2026-06-24

A no-new-release proof verified GHCR and Docker Hub stable tags, matching digest parity, and a disposable Docker Hub container `/api/health` response. The remaining registry gap is `ghcr.io/theretrovault/retrovault:nightly`, which returned `MANIFEST_UNKNOWN`.
