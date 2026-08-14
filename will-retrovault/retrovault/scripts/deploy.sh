#!/bin/bash
# RetroVault Deploy Script
# Usage:
#   bash scripts/deploy.sh [prod|dev|nightly] [branch]

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_ENV="${1:-prod}"
TARGET_BRANCH="${2:-}"

case "$TARGET_ENV" in
  prod)
    PM2_APP="retrovault-prod"
    DEFAULT_BRANCH="prod"
    PORT="3000"
    ;;
  dev)
    PM2_APP="retrovault-dev"
    DEFAULT_BRANCH="autopush"
    PORT="3001"
    ;;
  nightly)
    PM2_APP="retrovault-nightly"
    DEFAULT_BRANCH="nightly"
    PORT="3002"
    ;;
  *)
    echo "Unknown environment: $TARGET_ENV"
    echo "Usage: bash scripts/deploy.sh [prod|dev|nightly] [branch]"
    exit 1
    ;;
 esac

BRANCH="${TARGET_BRANCH:-$DEFAULT_BRANCH}"
cd "$APP_DIR"

echo "🕹️  RetroVault Deploy ($TARGET_ENV)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "📥 Pulling latest from GitHub..."
git fetch origin
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo "🌿 Switching branch: $CURRENT_BRANCH -> $BRANCH"
  git checkout "$BRANCH"
fi
git pull origin "$BRANCH"

echo "📦 Installing dependencies..."
npm install --frozen-lockfile 2>/dev/null || npm install

echo "🗂️  Ensuring env data directories exist..."
node scripts/setup-env-data.mjs

if [ "$TARGET_ENV" = "prod" ]; then
  echo "💾 Backing up prod runtime data before deploy..."
  node scripts/backup-runtime-data.mjs prod
fi

echo "🔨 Building production bundle..."
npm run build

echo "🧪 Verifying build artifacts before restart..."
npm run smoke:release

echo "🔄 Restarting pm2 process: $PM2_APP"
if pm2 describe "$PM2_APP" > /dev/null 2>&1; then
  pm2 reload ecosystem.config.js --only "$PM2_APP" --update-env
else
  pm2 start ecosystem.config.js --only "$PM2_APP"
fi

echo "🔥 Warming runtime and waiting for real readiness..."
node scripts/wait-for-runtime-ready.mjs --port "$PORT" --retries 8 --retry-delay-ms 2000 --warmup-rounds 2 --warmup-delay-ms 500 --asset-limit 12 --asset-retries 4 --asset-retry-delay-ms 1000

echo "🧪 Verifying live runtime after restart..."
npm run smoke:release -- --base-url "http://localhost:$PORT" --retries 5 --retry-delay-ms 2000 --asset-limit 20

echo ""
echo "✅ RetroVault deployed!"
echo "   Env: $TARGET_ENV"
echo "   Branch: $BRANCH"
echo "   Running at: http://127.0.0.1:$PORT"
echo ""
pm2 status "$PM2_APP"
