# RetroVault GitHub UI Checklist

This is the exact GitHub-side checklist for completing the remaining Product Availability Phase 1 actions that cannot be finished purely in-repo.

---

## 1. Make GHCR the primary public registry surface

### Goal
Ensure the package at `ghcr.io/theretrovault/retrovault` is publicly visible and matches the docs.

### GitHub UI steps
1. Open the RetroVault repository/org on GitHub.
2. Go to the package page for `retrovault` under Packages.
3. Confirm the package path is the expected GHCR path.
4. If visibility is private, change it to **Public**.
5. Confirm the package page is visible without authentication.

### Verification
- confirm the package page loads publicly
- later, after publish workflow exists, confirm tags appear as expected

---

## 2. Update GitHub About section

### Recommended short description
A self-hosted command center for retro game collectors.

### Recommended website field
For Phase 1, point to the best public install/docs surface available:
- install/docs entrypoint first
- GitHub repo itself if no separate docs site is preferred

### Recommended topics
- retro-gaming
- self-hosted
- game-collection
- game-inventory
- game-tracker
- price-tracker
- field-mode
- sqlite
- nextjs
- open-source
- homelab
- docker

### GitHub UI steps
1. Open repository main page.
2. Click the About/settings pencil.
3. Set the short description.
4. Set website URL.
5. Add/update topics.
6. Save.

---

## 3. Enable GitHub Discussions publicly

### Goal
Keep Phase 1 community/support GitHub-first without requiring Discord yet.

### Recommended categories
- Q&A
- Ideas
- Show and Tell
- Releases / Announcements

### GitHub UI steps
1. Open repository Settings.
2. Find Discussions.
3. Enable Discussions.
4. Create or tune the core categories above.
5. Make sure README/docs can point at Discussions confidently.

---

## 4. Check pinned/public repo surfaces

### Goal
Make the public repo surface feel intentional.

### Verify
- README is the main public landing experience
- About section is filled in
- Discussions are enabled
- Releases are visible
- GHCR package is public

---

## 5. Not part of this UI pass

These are intentionally later or separate:
- Docker Hub mirror activation
- dedicated landing page/domain
- screenshots/GIFs in README top section
- Discord public community rollout

---

## Done criteria

This GitHub UI pass is complete when:
- GHCR package is public
- About section uses the approved positioning
- Discussions are enabled publicly
- README/docs links are coherent with those settings
