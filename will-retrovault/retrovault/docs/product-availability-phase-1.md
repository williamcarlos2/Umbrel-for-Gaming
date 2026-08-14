# RetroVault Product Availability, Phase 1

This workstream is intentionally separate from feature backlog and runtime hardening backlog.
Its purpose is to make RetroVault discoverable, installable, and credible on the usual platforms people expect for a self-hosted open-source app.

## Phase 1 scope

Priority surfaces:
- GitHub
- GHCR (GitHub Container Registry) as the primary public registry
- Docker Hub as a later convenience mirror
- docs site / docs surface
- landing-page messaging assets
- GitHub-first community/support entrypoints (Issues + Discussions)

Phase 2 surfaces are intentionally deferred until Phase 1 is cleaner:
- YouTube
- Reddit launch
- Awesome-selfhosted
- listing/directory sites
- Unraid / CasaOS / similar catalogs

---

## Phase 1 tasks I can do without Alex

### GitHub polish
- Audit README for public-facing clarity, screenshots, install paths, and support/community links
- Improve release/distribution/operator documentation in-repo
- Create a concrete launch/distribution checklist
- Draft GitHub issue/discussion/support structure recommendations
- Prepare copy for repo description, short description, release notes structure, and community messaging

### GHCR readiness
- Audit current GitHub Actions/container workflows for GHCR publishing quality
- Document the desired GHCR tagging model (`latest`, `nightly`, semver tags)
- Prepare workflow updates or checklist items for multi-arch/container metadata if missing
- Document exact verification steps for package visibility and pull instructions; stable install proof completed 2026-06-24

### Docker Hub readiness
- Prepare Docker Hub publishing checklist and tag strategy
- Draft Docker Hub repo description / README copy
- Document exact CI wiring needed for mirrored pushes from GitHub Actions

### Docs surface
- Create or improve docs around:
  - install paths
  - upgrade flow
  - backup/restore
  - release channels (`autopush`, `nightly`, `prod`)
  - public support/community entrypoints
- Create a product-availability rollout checklist so platform work is sequenced cleanly

### Landing/distribution messaging assets
- Draft homepage/landing page copy blocks
- Draft concise product descriptions for GitHub, Docker Hub, directories, and social profiles
- Define the core messaging stack: what RetroVault is, who it is for, why it exists, why self-hosted matters

### Discord/community readiness
- Define recommended Discord server/channel structure
- Draft onboarding/support/announcement copy and recommended channel purposes

---

## Phase 1 decisions now locked in

- Docker Hub namespace/repo target: `retrovault/retrovault`
- GHCR is the primary public registry
- Docker Hub is a convenience mirror, not the primary registry authority
- community remains GitHub-first for Phase 1
- GitHub Discussions should be enabled as a public async community surface
- dedicated public landing domain is deferred and should live in Product Availability backlog, not Phase 1 execution
- preferred broad public tagline direction: "A self-hosted command center for retro game collectors."
- screenshots are deferred to Phase 2

---

## Phase 1 tasks that need Alex

### Accounts / platform ownership
- Create or confirm the official Docker Hub org/repo
- Confirm the canonical public web domain / landing-page domain later when the backlog item is activated
- Confirm the canonical Discord server/invite later if community strategy expands beyond GitHub-first Phase 1
- Confirm which GitHub org/account is the permanent public home if any transfer/change is planned

### GitHub settings / platform actions
- Make GHCR package public if still private in GitHub UI
- Configure repository social preview / About section / pinned links
- Enable GitHub Discussions publicly
- Provide any required secrets/tokens for Docker Hub automated publishing later when the mirror is activated

### Brand / positioning choices
- Finalize short tagline / one-line positioning if we want a tighter public message than current README copy
- Approve which screenshots / visuals are the public-first set
- Decide whether Phase 1 includes a dedicated landing page now or only README/docs polish first

### Community / launch decisions
- Decide whether Discord is public now or later
- Decide whether GitHub Discussions should be the primary async community surface or secondary to Discord
- Approve when Phase 2 launch surfaces should begin after Phase 1 is solid

---

## Recommended execution order

### Do now without Alex
1. Product availability planning/checklist docs
2. README / docs / distribution copy polish
3. GHCR + Docker Hub workflow/readiness audit
4. Discord/community structure recommendation
5. Landing-page copy draft

### Then ask Alex for the minimum unblockers
1. Docker Hub org/repo + token
2. canonical domain decision
3. public Discord/invite decision
4. GitHub package visibility / About/discussions choices
5. screenshot/branding approval

---

## Definition of done for Phase 1

Phase 1 is considered ready when:
- GitHub is polished and clearly explains install/use/support
- GHCR publishing is documented and trustworthy
- Docker Hub publishing path is ready or live
- docs support install/upgrade/backup/release-channel questions cleanly
- community/public entrypoints are defined
- the remaining user-dependent actions are small, explicit, and easy to execute

---

## Separate backlog note

Keep these out of the main feature backlog bucket:
- Product availability / distribution work

Keep these in other lanes:
- peripherals/hardware tracking
- Steam connector work
- runtime hardening / parity cleanup
- broader collectible media expansion
