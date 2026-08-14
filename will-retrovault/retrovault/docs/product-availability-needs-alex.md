# RetroVault Product Availability — Needs Alex

This document is the short, explicit handoff for the Product Availability Phase 1 items that cannot be completed unilaterally.

The goal is to keep asks small, concrete, and easy to knock out once the self-serve prep is in place.

---

## 1. Docker Hub ownership

Confirmed direction:
- official target repo path is `retrovault/retrovault`

Still needed later when the mirror is activated:
- a Docker Hub access token/credentials for GitHub Actions secrets

---

## 2. GHCR public visibility

Please confirm or perform:
- make the GHCR package public in GitHub UI if it is still private

Why this matters:
- docs already position GHCR as a primary distribution surface
- public pull/install trust now has stable proof for `v2.1.44` / `latest`; remaining trust work is GitHub/About/support polish and nightly verification

---

## 3. Public domain / landing-page decision

Confirmed direction:
- Phase 1 should use GitHub + docs only for now
- dedicated public landing domain should be treated as a later Product Availability backlog item

This will later affect:
- GitHub About links
- public docs/branding links
- future screenshots/social/share surfaces

---

## 4. Discord / community decision

Confirmed direction:
- keep community GitHub-first in Phase 1
- do not require a public Discord surface yet

If Discord becomes public later, we can add it as the canonical real-time community surface in a later availability phase.

---

## 5. GitHub Discussions / About settings

Confirmed direction:
- GitHub Discussions should be part of the public community surface
- GitHub About should be updated as part of Phase 1

Recommended About fields to eventually set:
- website/docs link
- short public description
- topics/tags

Prepared handoff doc:
- `docs/github-settings-handoff.md`

---

## 6. Public-facing visual assets

Confirmed direction:
- screenshots should wait until Phase 2
- GIFs/video previews can also wait until Phase 2 unless a later reason changes that
- tagline direction is broad and general rather than collector-only or flip-only

---

## Lowest-friction order for Alex asks

Recommended remaining sequence:
1. make GHCR public if needed
2. apply GitHub About / Discussions updates
3. provide Docker Hub token later when the mirror is activated
4. revisit landing domain in backlog
5. revisit screenshots in Phase 2

---

## What does NOT need Alex yet

Already being handled/prepared without needing decisions right now:
- availability planning docs
- checklist docs
- GHCR readiness guidance
- Docker Hub readiness guidance
- Discord/community structure recommendation
- GitHub public-surface recommendation
- README/docs wiring for the new availability lane
