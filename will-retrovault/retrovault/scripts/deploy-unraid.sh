#!/usr/bin/env bash
set -Eeuo pipefail
shopt -s inherit_errexit 2>/dev/null || true

usage() {
  printf 'Usage: %s dev|prod [image]\n' "${0##*/}" >&2
}

main() {
  local env_name="${1:-}"
  local image="${2:-}"
  if [[ -z "$env_name" ]]; then usage; exit 64; fi

  local name port root tag scheduler backup_mount backup_mode
  case "$env_name" in
    dev)
      name="RetroVault-Dev"; port="3001"; root="/mnt/cache/appdata/retrovault-dev"; tag="retrovault:dev"; scheduler="false"; backup_mount="$root/backups/db"; backup_mode="rw" ;;
    prod)
      name="RetroVault"; port="3003"; root="/mnt/cache/appdata/retrovault"; tag="retrovault:main"; scheduler="true"; backup_mount="/mnt/disk5/appdata/retrovault/backups/db"; backup_mode="ro" ;;
    *) usage; exit 64 ;;
  esac
  image="${image:-$tag}"

  mkdir -p "$root/data" "$root/logs" "$backup_mount"
  chown -R 1001:1001 "$root" || true

  docker rm -f "$name" >/dev/null 2>&1 || true
  docker run -d \
    --name "$name" \
    --restart unless-stopped \
    -p "$port:3000" \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e HOSTNAME=0.0.0.0 \
    -e RETROVAULT_ENV="$env_name" \
    -e RETROVAULT_SCHEDULER_ENABLED="$scheduler" \
    -e RETROVAULT_DATA_DIR=/app/data \
    -e RETROVAULT_DB_PATH=/app/data/retrovault.db \
    -e DATABASE_URL=file:/app/data/retrovault.db \
    -e RETROVAULT_CONFIG_PATH=/app/data/app.config.json \
    -e RETROVAULT_SCRAPERS_PATH=/app/data/scrapers.json \
    -e RETROVAULT_DB_BACKUP_DIR=/app/backups/db \
    -v "$root/data:/app/data" \
    -v "$root/logs:/app/logs" \
    -v "$backup_mount:/app/backups/db:$backup_mode" \
    "$image" >/dev/null

  for _ in $(seq 1 30); do
    if curl -fsS --max-time 5 "http://127.0.0.1:$port/api/health" >/dev/null; then
      docker ps --filter "name=$name" --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
      printf 'Verified %s at http://127.0.0.1:%s\n' "$name" "$port"
      return 0
    fi
    sleep 2
  done
  docker logs "$name" >&2 || true
  printf 'ERROR: %s did not become healthy on port %s\n' "$name" "$port" >&2
  return 1
}

main "$@"
