#!/bin/sh
# RetroVault Docker Entrypoint
# Runs database setup on first start, then starts the app.

set -e

DATA_DIR="${RETROVAULT_DATA_DIR:-/app/data}"
DB_PATH="${RETROVAULT_DB_PATH:-${DATA_DIR}/retrovault.db}"
DATABASE_URL="${DATABASE_URL:-file:${DB_PATH}}"

export RETROVAULT_DATA_DIR="${DATA_DIR}"
export RETROVAULT_DB_PATH="${DB_PATH}"
export DATABASE_URL

echo "[entrypoint] RetroVault starting..."

# ── Ensure data directory exists and is writable ─────────────────────────────
# On fresh installs the mounted volume may be owned by root.
# We attempt to fix permissions; if we can't (no sudo), we warn and continue.
mkdir -p "${DATA_DIR}" 2>/dev/null || true

# ── Run SQLite migrations ─────────────────────────────────────────────────────
# 'prisma migrate deploy' is idempotent — safe to run on every startup.
# Creates the DB if it doesn't exist, applies any pending migrations.
# Skip if the data directory isn't writable (first-run permission issue).
if [ -w "${DATA_DIR}" ]; then
  echo "[entrypoint] Applying database migrations..."
  DATABASE_URL="${DATABASE_URL}" npx prisma migrate deploy 2>&1 && \
    echo "[entrypoint] Database ready." || \
    echo "[entrypoint] WARNING: Migration failed — check DATA_DIR permissions"
else
  echo "[entrypoint] WARNING: ${DATA_DIR} is not writable. Skipping migrations."
  echo "[entrypoint] Fix: ensure the retrovault-data volume is owned by uid 1001"
  echo "[entrypoint]   docker run --rm -v retrovault_retrovault-data:/data alpine chown -R 1001:1001 /data"
fi

# ── Start the app ─────────────────────────────────────────────────────────────
echo "[entrypoint] Starting RetroVault on port ${PORT:-3000}..."
exec "$@"
