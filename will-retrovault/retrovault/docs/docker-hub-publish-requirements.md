# RetroVault Docker Hub Publish Requirements

This is the concrete handoff/checklist for keeping Docker Hub as a real public stable mirror rather than a separate/manual distribution surface.

---

## Goal

Publish RetroVault to Docker Hub using the same release discipline as GitHub/GHCR so users can rely on familiar tags without registry drift.

---

## Minimum requirements

### 1. Official Docker Hub repo
Confirmed target:
- `retrovault/retrovault`

### 2. Automation credentials
Need Alex to provide/store as GitHub secrets:
- Docker Hub username or robot account identifier
- Docker Hub access token

### 3. Tag policy
Current mirror scope:
- `latest`
- semver tags such as `2.1.25`
- optional `v2.1.25` mirror tag if we want exact Git tag matching too

Explicitly not mirrored right now:
- `nightly`

### 4. Publish authority
Recommended rule:
- GitHub Actions is the publish authority
- do not maintain Docker Hub manually unless as a temporary fallback

---

## Recommended GitHub Actions inputs/secrets

Examples of likely needed secrets:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Potential publish points:
- stable release tags from `prod`
- optional nightly publication from `nightly` later if desired

---

## Verification checklist

After setup:
- [x] image can be pulled from Docker Hub
- [x] expected tags exist
- [x] README/description text is drafted and merged into Docker Hub readiness copy
- [x] Docker Hub tags match GHCR tags for the same release
- [x] documented install path actually works end-to-end

---

## Recommendation

Do not publish Docker Hub first and clean it up later. Treat it as a mirror that should launch cleanly, with the same trust and predictability as GitHub/GHCR. Current implementation should mirror stable GHCR release tags only.


## Verification proof — 2026-06-24

Verified stable mirror state:

- Docker Hub repo `retrovault/retrovault` is public and active.
- `latest`, `v2.1.44`, and `2.1.44` exist, along with prior stable tags.
- `retrovault/retrovault:v2.1.44` pulls and starts with `RETROVAULT_SCHEDULER_ENABLED=false`.
- `/api/health` returned `status: ok` from the disposable proof container.
- Docker Hub and GHCR stable digests match for `v2.1.44` / `latest`: `sha256:e8fe85f352c91070d66570cb4c288d13cf5d53d16269ffaee5d4e55426cdc366`.
