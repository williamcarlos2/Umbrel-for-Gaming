# RetroVault GitHub Public Surface Recommendation

This document defines what the public GitHub surface for RetroVault should communicate and what should be improved before broader distribution/launch work.

---

## Goal

When someone lands on the RetroVault GitHub repo, they should understand in under 60 seconds:
- what RetroVault is
- who it is for
- why it is different
- how to install it
- where to get help
- where the container/distribution surfaces live

---

## Public-surface checklist

### Must be obvious near the top
- [ ] one-line value proposition
- [ ] install path(s)
- [ ] screenshots or clearly planned visual proof
- [ ] links to docs
- [ ] support/community entrypoints
- [ ] release/distribution surfaces (GHCR, Docker Hub when live)

### Must be easy to trust
- [ ] clear license
- [ ] clear release process/docs
- [ ] backup/restore guidance
- [ ] explanation of self-hosted data ownership
- [ ] operator-friendly upgrade path

### Must be easy to act on
- [ ] Docker quickstart
- [ ] native quickstart
- [ ] docs links
- [ ] issue/discussion/support links

---

## Recommended GitHub About text

Self-hosted retro game collection manager for collectors, flippers, and hunters. Track inventory, market prices, Field Mode buying decisions, watchlists, sales, and collection value.

---

## Recommended short repo description variants

### Short
Self-hosted retro game collection manager with market pricing, Field Mode, watchlists, sales tracking, and backup-friendly local ownership.

### Shorter
Self-hosted retro game collection manager for collectors, flippers, and hunters.

### Technical-leaning
Next.js + SQLite self-hosted retro game vault with inventory, pricing, Field Mode, P&L, and operator-safe backup/restore workflows.

---

## Recommended pinned external links

When available, prioritize:
1. docs / install guide
2. official website or landing page
3. Discord/community invite
4. Docker Hub or GHCR package page

---

## Recommended README improvements

### High priority
- add explicit distribution section mentioning GHCR and future Docker Hub mirror
- add explicit support/community section with GitHub + Discord guidance
- add product-availability docs to docs references
- tighten "getting started" so install paths are unmistakable

### Medium priority
- add screenshots/media once approved
- add a short "Why self-hosted" value block near the top
- add a "Where RetroVault lives" section once Phase 1 surfaces are live

---

## Work I can do without Alex

- prepare recommendation text
- prepare README/docs improvements
- prepare link structure and messaging hierarchy

---

## Work that needs Alex

- confirm final public links to promote
- approve screenshots / visuals
- decide whether GitHub Discussions should be part of the public entry surface

---

## Recommendation

GitHub should remain the canonical public source of truth even if Docker Hub, GHCR, and a future landing page also exist. Every other public surface should feel like an on-ramp back to GitHub + docs, not a competing authority.
