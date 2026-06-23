#!/usr/bin/env bash
# ==============================================================================
# Vigil.AI V2 — Aggiornamento OTA
# Uso: bash scripts/update_vigilai.sh <URL_TAR_GZ> <VERSIONE> [SHA256]
# ==============================================================================
set -euo pipefail

URL="${1:-}"
VERSION="${2:-}"
SHA256="${3:-}"
APP_DIR="${VIGILAI_APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_DIR="$HOME/vigilai_backups/$(date +%Y%m%d-%H%M%S)"
STATUS_FILE="$APP_DIR/.update-status.json"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/update.log"
TMP_ARCHIVE=""
EXTRACT_DIR=""

write_status() {
  local state="$1"
  local progress="${2:-0}"
  local message="$3"
  local error="${4:-}"
  mkdir -p "$LOG_DIR"
  python3 - "$STATUS_FILE" "$state" "$progress" "$message" "$VERSION" "$error" <<'PY'
import json, sys
from datetime import datetime, timezone
path, state, progress, message, version, error = sys.argv[1:7]
payload = {
    "state": state,
    "progress": int(float(progress)),
    "message": message,
    "availableVersion": version,
    "lastCheck": datetime.now(timezone.utc).isoformat(),
}
if error:
    payload["error"] = error
try:
    with open(path, "r", encoding="utf-8") as f:
        current = json.load(f)
except Exception:
    current = {}
current.update(payload)
with open(path, "w", encoding="utf-8") as f:
    json.dump(current, f, indent=2)
PY
}

rollback() {
  local code=$?
  echo "[Update] ERRORE (exit $code) — avvio rollback da $BACKUP_DIR"
  write_status rollback 0 "Ripristino versione precedente..." "Aggiornamento fallito"
  if [[ -f "$BACKUP_DIR/.env" ]]; then
    cp "$BACKUP_DIR/.env" "$APP_DIR/.env"
  fi
  if [[ -d "$BACKUP_DIR/dist" ]]; then
    rm -rf "$APP_DIR/dist"
    cp -a "$BACKUP_DIR/dist" "$APP_DIR/dist"
  fi
  sudo systemctl restart vigilai || true
  write_status error 0 "Aggiornamento annullato. Versione precedente ripristinata." "Rollback completato"
  exit "$code"
}

cleanup() {
  [[ -n "$TMP_ARCHIVE" && -f "$TMP_ARCHIVE" ]] && rm -f "$TMP_ARCHIVE"
  [[ -n "$EXTRACT_DIR" && -d "$EXTRACT_DIR" ]] && rm -rf "$EXTRACT_DIR"
}
trap rollback ERR
trap cleanup EXIT

if [[ -z "$URL" || -z "$VERSION" ]]; then
  echo "Uso: $0 <URL> <VERSION> [SHA256]"
  exit 1
fi

mkdir -p "$BACKUP_DIR" "$LOG_DIR"
exec >>"$LOG_FILE" 2>&1
echo "===== Vigil.AI update v$VERSION — $(date -Iseconds) ====="

write_status downloading 10 "Download pacchetto v${VERSION}..."
TMP_ARCHIVE="$(mktemp /tmp/vigilai-update-XXXXXX.tar.gz)"
curl -fsSL "$URL" -o "$TMP_ARCHIVE"

if [[ -n "$SHA256" ]]; then
  echo "$SHA256  $TMP_ARCHIVE" | sha256sum -c -
fi

write_status downloading 25 "Backup configurazione (.env)..."
if [[ -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env" "$BACKUP_DIR/.env"
fi
if [[ -d "$APP_DIR/dist" ]]; then
  cp -a "$APP_DIR/dist" "$BACKUP_DIR/dist"
fi

write_status installing 45 "Estrazione nuova versione..."
EXTRACT_DIR="$(mktemp -d /tmp/vigilai-extract-XXXXXX)"
tar -xzf "$TMP_ARCHIVE" -C "$EXTRACT_DIR"

SRC="$EXTRACT_DIR"
if [[ $(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 | wc -l) -eq 1 ]]; then
  SRC="$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 | head -1)"
fi

rsync -a \
  --exclude node_modules \
  --exclude dist \
  --exclude .env \
  --exclude .git \
  --exclude logs \
  --exclude .update-status.json \
  "$SRC/" "$APP_DIR/"

write_status installing 65 "Installazione dipendenze npm..."
cd "$APP_DIR"
npm install --ignore-scripts --legacy-peer-deps

write_status installing 82 "Compilazione frontend..."
npm run build

write_status installing 95 "Riavvio servizio Vigil.AI..."
sudo systemctl restart vigilai

write_status success 100 "Aggiornamento v${VERSION} completato. Riavvio sistema..."
sleep 4
sudo reboot
