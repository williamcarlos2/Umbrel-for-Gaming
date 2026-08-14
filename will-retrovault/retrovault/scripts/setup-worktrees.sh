#!/bin/bash
# Create local RetroVault worktrees for autopush, nightly, and prod.
# Usage: bash scripts/setup-worktrees.sh [base-dir]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_DIR="${1:-$(dirname "$REPO_ROOT")}" 

cd "$REPO_ROOT"

echo "🌳 Setting up RetroVault worktrees"
echo "Repo: $REPO_ROOT"
echo "Base: $BASE_DIR"

ensure_branch() {
  local branch="$1"
  local start_ref="$2"

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    echo "• local branch exists: $branch"
    return
  fi

  if git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
    echo "• creating local branch from origin/$branch"
    git branch --track "$branch" "origin/$branch"
  else
    echo "• creating new branch $branch from $start_ref"
    git branch "$branch" "$start_ref"
  fi
}

ensure_worktree() {
  local branch="$1"
  local dir="$BASE_DIR/retrovault-$branch"

  if [ -d "$dir/.git" ] || [ -f "$dir/.git" ]; then
    echo "• worktree already exists: $dir"
    return
  fi

  echo "• adding worktree: $dir ($branch)"
  git worktree add "$dir" "$branch"
}

ensure_branch prod origin/prod
ensure_branch nightly origin/nightly
ensure_branch autopush origin/autopush

ensure_worktree autopush
ensure_worktree nightly
ensure_worktree prod

echo ""
echo "✅ Worktrees ready"
git worktree list
