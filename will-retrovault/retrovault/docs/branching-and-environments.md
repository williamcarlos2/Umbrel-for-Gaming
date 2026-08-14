# RetroVault Branching, Environments, and Release Workflow

## Branch model

- `dev` is the integration/staging branch and deploys to `RetroVault-Dev` / <https://retrovault-dev.peschpit.com>.
- `main` is the production branch and deploys to `RetroVault` / <https://retrovault.peschpit.com>.
- `prod` is a legacy branch retained during migration from the pre-Unraid workflow. Do not use it for new work.

Promotion is intentionally manual:

1. merge feature work into `dev`
2. deploy/verify dev
3. fast-forward `main` from `dev`
4. tag a release from `main`
5. GitHub Actions publishes GitHub Release + GHCR + DockerHub images
6. deploy production on Unraid from the approved image/code

## Runtime split on Unraid/Tower

| Environment | Branch | Container | Port | Appdata | Public URL | Scheduler |
| --- | --- | --- | --- | --- | --- | --- |
| dev | `dev` | `RetroVault-Dev` | `3001:3000` | `/mnt/cache/appdata/retrovault-dev` | `https://retrovault-dev.peschpit.com` | disabled |
| prod | `main` | `RetroVault` | `3003:3000` | `/mnt/cache/appdata/retrovault` | `https://retrovault.peschpit.com` | enabled |

Dev and prod must not share mutable data directories. Dev may be seeded from prod for testing, but once copied it is its own appdata tree.

## Local Unraid deploy commands

Build and redeploy dev:

```bash
cd /mnt/disk5/applications/neo/projects/retrovault/retrovault
git checkout dev
git pull --ff-only origin dev
docker build -t retrovault:dev .
bash scripts/deploy-unraid.sh dev retrovault:dev
```

Build and redeploy prod from main:

```bash
cd /mnt/disk5/applications/neo/projects/retrovault/retrovault
git checkout main
git pull --ff-only origin main
docker build -t retrovault:main .
bash scripts/deploy-unraid.sh prod retrovault:main
```

Promote `dev` to `main` after dev verification:

```bash
cd /mnt/disk5/applications/neo/projects/retrovault
bash retrovault/scripts/promote-dev-to-main.sh
```

## GitHub release pipeline

The robust pre-Unraid release pipeline still exists in `.github/workflows/release.yml` and triggers on tags matching `v*.*.*`.

Release workflow capabilities:

- installs dependencies
- bootstraps env data
- applies Prisma migrations
- generates Prisma client
- runs tests
- builds Next.js app
- runs release smoke checks
- builds linux/amd64 Docker image
- pushes to GHCR: `ghcr.io/theretrovault/retrovault`
- pushes to DockerHub: `retrovault/retrovault`
- creates a GitHub release

Required GitHub secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

`GITHUB_TOKEN` is supplied automatically for GHCR/package and release creation.

## Release SOP

```bash
cd /mnt/disk5/applications/neo/projects/retrovault
bash retrovault/scripts/promote-dev-to-main.sh
npm --prefix retrovault version patch --no-git-tag-version
git add retrovault/package.json retrovault/package-lock.json
git commit -m "chore: release v$(node -p \"require('./retrovault/package.json').version\")"
git tag "v$(node -p \"require('./retrovault/package.json').version\")"
git push origin main --tags
```

Watch GitHub Actions for the tag release. After DockerHub/GHCR publish and smoke checks pass, deploy prod on Unraid using the approved image or local build.

## Verification checklist

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- local Docker health: `/api/health`
- backup panel: `/api/database-backup-integrity`
- dev public URL returns JSON/HTML through nginx
- prod public URL still points at `RetroVault` on port `3003`
- DockerHub tag exists after release
- GHCR tag exists after release
