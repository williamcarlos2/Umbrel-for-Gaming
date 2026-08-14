#!/usr/bin/env bash
set -Eeuo pipefail
shopt -s inherit_errexit 2>/dev/null || true

main() {
  local repo_root
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
  cd "$repo_root"

  git fetch origin dev main --tags
  git checkout dev
  git pull --ff-only origin dev

  (cd retrovault && npm test && npx tsc --noEmit && npm run build)

  git checkout main
  git pull --ff-only origin main
  git merge --ff-only dev
  git push origin main

  printf 'Promoted dev -> main at %s\n' "$(git rev-parse --short HEAD)"
  printf 'Next: create/push a vX.Y.Z tag to run the GitHub release workflow and publish DockerHub/GHCR images.\n'
}

main "$@"
