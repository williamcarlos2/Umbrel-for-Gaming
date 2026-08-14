# RetroVault Docker Hub Readiness

This document defines what RetroVault should look like on Docker Hub and what remains to make that surface clean, trustworthy, and easy to use.

---

## Goal

Make RetroVault available on Docker Hub because many self-hosters search there first, even if GHCR remains the more natural primary registry.

Recommended canonical Docker Hub repo shape:
- official repo path: `retrovault/retrovault`
- image naming should mirror GHCR tags as closely as possible

---

## Recommended role of Docker Hub

Docker Hub should be treated as:
- a discoverability surface
- a convenience mirror for users
- a familiar install path for self-hosters

GHCR can remain the more GitHub-native primary source of truth for image publishing.

---

## Desired tag model

Mirror GHCR as closely as possible for stable releases:
- `latest`
- semver tags like `2.1.25`
- optional `v2.1.25` mirror tag if GHCR keeps both styles

Current scope decision:
- stable only for Docker Hub right now
- `nightly` remains GHCR-only for now

Rule of thumb:
- same image content across GHCR and Docker Hub for equivalent stable tags
- avoid letting Docker Hub drift into a separate manual release path

---

## Readiness checklist

### Public surface
- [x] official Docker Hub repo exists (`retrovault/retrovault`)
- [x] description clearly explains what RetroVault is
- [x] long description mirrors or adapts the README well
- [x] tags are predictable and documented
- [x] install example is visible in Docker Hub description

### Automation
- [x] GitHub Actions can authenticate to Docker Hub
- [x] stable release tags publish automatically
- [x] optional nightly tag publish behavior is defined
- [x] no manual-only publish process unless intentionally temporary

### Trust / operator experience
- [x] docs explain persistence volumes and environment expectations
- [ ] docs explain upgrade expectations
- [ ] backup/restore guidance is linked nearby
- [x] image naming matches docs exactly (`retrovault/retrovault`)

---

## Draft Docker Hub short description

RetroVault is a self-hosted retro game collection manager for collectors, flippers, and hunters, with inventory tracking, market pricing, Field Mode, P&L, and watchlist tools.

---

## Draft Docker Hub long description

RetroVault is a self-hosted retro game collection manager built for people who buy, sell, trade, and track retro games seriously. It combines collection management, live market pricing, field buying tools, watchlists, sales tracking, and operator-friendly backup/restore workflows in one app.

Highlights:
- collection inventory with copies, condition, purchase history, and market pricing
- Field Mode for garage sales, conventions, and live buying decisions
- P&L tracking, flip tools, and sourcing/business workflows
- watchlists, goals, grails, play log, and achievement systems
- self-hosted, open source, and designed around keeping your data under your control

For install, upgrade, and backup/restore guidance, see the GitHub README and docs.

---

## Work I can do without Alex

- define the recommended Docker Hub role in the distribution model
- draft repo copy and description text
- define the tag strategy and parity expectations vs GHCR
- document the CI/token requirements for automated publishing
- document verification steps

---

## Work that needs Alex

- confirm whether nightly images should also publish publicly to Docker Hub later

---

## Recommended verification steps

### Pull test
```bash
docker pull retrovault/retrovault:latest
```

### Install test
Use the documented compose path and verify:
- initial startup works cleanly
- volumes persist runtime state
- upgrade path does not lose runtime data

### Release verification
For each stable release:
- confirm matching semver tag exists on Docker Hub
- confirm `latest` points to the expected stable release
- confirm docs still match the real repo/image/tag names

---

## Recommendation

Use Docker Hub as a public convenience mirror, not as a separate release authority. Publish from the same GitHub-driven automation path that feeds GHCR so users get consistency instead of registry drift. Current implementation scope is stable-only mirroring to `retrovault/retrovault`.
---

## Docker Hub overview copy

Use this as the Docker Hub repository overview / long description when the public mirror is ready.

```markdown
# 👾 RetroVault

**A self-hosted command center for retro game collectors.**

RetroVault is a self-hosted web app for collectors, hunters, and flippers who want more than a spreadsheet. It tracks your game inventory, keeps market pricing close at hand, helps you make buying decisions in the field, and keeps your collection data on your own machine.

## Highlights

- 🕹️ **Collection tracking** — games, copies, condition, purchase history, notes, CIB status, duplicate awareness, and platform progress.
- 💰 **Market context** — PriceCharting-powered values, price history, trend-aware collection views, flip tools, and P&L workflows.
- 🔦 **Field Mode** — fast garage-sale/convention lookup with dupe alerts, wishlist context, and buying-decision support.
- 🏆 **Collector tools** — grail tracking, play log, achievements, milestones, hot list, and sourcing analytics.
- 🧰 **Self-hosted operations** — local data files, Docker-friendly deployment, backups by copying/mounting your data directory, and no hosted subscription lock-in.

## Quick start

```bash
mkdir -p retrovault-data
# Create or copy an app config into retrovault-data/app.config.json before first use.

docker run -d   --name retrovault   -p 3000:3000   -v "$PWD/retrovault-data:/app/data"   retrovault/retrovault:latest
```

Then open:

```text
http://localhost:3000
```

For the most complete and current install path, including Docker Compose, native setup, backups, upgrades, and platform-specific notes, use the GitHub docs:

https://github.com/theretrovault/retrovault

## Persistence

RetroVault stores runtime data under `/app/data` in the container. Mount this path to a host directory or named volume so your collection survives container upgrades.

Example volume shape:

```text
/app/data
├── retrovault.db
├── app.config.json
├── scrapers.json
└── backups/
```

Before upgrading, back up the mounted data directory or use RetroVault's documented runtime backup workflow from the GitHub docs.

## Tags

Stable Docker Hub mirror tags are intended to match the GitHub/GHCR release line:

- `latest`
- semantic version tags such as `2.1.44`
- matching `v2.1.44` tags when published by the release workflow

GHCR remains the GitHub-native registry surface:

```text
ghcr.io/theretrovault/retrovault
```

Docker Hub is a convenience mirror for self-hosters who prefer Docker Hub:

```text
retrovault/retrovault
```

## Links

- GitHub: https://github.com/theretrovault/retrovault
- Install docs: https://github.com/theretrovault/retrovault/blob/main/retrovault/docs/installation.md
- Releases: https://github.com/theretrovault/retrovault/releases
- Issues/support: https://github.com/theretrovault/retrovault/issues

## License

RetroVault is open source under the MIT license.
```


## Stable proof — 2026-06-24

Docker Hub is no longer only planned: `retrovault/retrovault` is public and active. Verified tags include `latest`, `v2.1.44`, `2.1.44`, `v2.1.43`, `2.1.43`, `v2.1.42`, `2.1.42`, `v2.1.41`, and `2.1.41`. The stable `v2.1.44` / `latest` digest matches GHCR at `sha256:e8fe85f352c91070d66570cb4c288d13cf5d53d16269ffaee5d4e55426cdc366`, and a disposable `retrovault/retrovault:v2.1.44` container returned `/api/health` with `status: ok`.
