#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${TIME_CAPSULE_CLOUDFLARE_ENV_FILE:-$ROOT_DIR/.env.cloudflare}"

cd "$ROOT_DIR"

if [[ -e "$ENV_FILE" && ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] Cloudflare credential path is not a regular file: $ENV_FILE" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "[OK] Loading current-project Cloudflare credentials"
  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    case "$key" in
      CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        export "$key=$value"
        ;;
    esac
  done < "$ENV_FILE"
fi

: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN or provide TIME_CAPSULE_CLOUDFLARE_ENV_FILE}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID or provide TIME_CAPSULE_CLOUDFLARE_ENV_FILE}"

export PATH="/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

echo "=== Building Time Capsule ==="
bash "$ROOT_DIR/scripts/build-website.sh"

if [[ ! -d "$ROOT_DIR/apps/web/dist" ]]; then
  echo "[ERROR] Build output apps/web/dist was not created" >&2
  exit 1
fi

echo "=== Deploying Time Capsule to Cloudflare Pages ==="
WRANGLER_BIN="$ROOT_DIR/node_modules/.bin/wrangler"
if [[ ! -x "$WRANGLER_BIN" ]]; then
  echo "[ERROR] Local Wrangler is missing. Run bun install before deploying." >&2
  exit 1
fi

"$WRANGLER_BIN" pages deploy apps/web/dist --project-name time-capsule
echo "[SUCCESS] Time Capsule deployed"
