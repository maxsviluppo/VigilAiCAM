#!/usr/bin/env bash
# ==============================================================================
# Crea archivio release Vigil.AI V2 per OTA
# Uso: bash scripts/publish_release.sh [versione]
# Es:  bash scripts/publish_release.sh 2.0.1
# ==============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-$(node -p "require('$ROOT/package.json').version" 2>/dev/null || echo 2.0.1)}"
ARCHIVE="vigilai-raspberry-${VERSION}.tar.gz"
OUT_DIR="$ROOT/releases"
STAGE="$OUT_DIR/stage-vigilai-raspberry-${VERSION}"

rm -rf "$STAGE" "$OUT_DIR/$ARCHIVE"
mkdir -p "$STAGE" "$OUT_DIR"

rsync -a "$ROOT/" "$STAGE/" \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  --exclude releases \
  --exclude logs \
  --exclude .env \
  --exclude .env.bak \
  --exclude .update-status.json \
  --exclude "*.log"

node -e "
const fs = require('fs');
const p = process.argv[1];
const version = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
pkg.version = version;
fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
" "$STAGE/package.json" "$VERSION"

tar -czf "$OUT_DIR/$ARCHIVE" -C "$OUT_DIR" "stage-vigilai-raspberry-${VERSION}"
rm -rf "$STAGE"

if command -v sha256sum >/dev/null 2>&1; then
  SHA=$(sha256sum "$OUT_DIR/$ARCHIVE" | awk '{print $1}')
elif command -v shasum >/dev/null 2>&1; then
  SHA=$(shasum -a 256 "$OUT_DIR/$ARCHIVE" | awk '{print $1}')
else
  SHA=""
fi

cat > "$OUT_DIR/version-${VERSION}.json" <<EOF
{
  "version": "${VERSION}",
  "url": "https://github.com/TUO-UTENTE/vigilai-raspberry/releases/download/v${VERSION}/${ARCHIVE}",
  "sha256": "${SHA}",
  "changelog": "Release Vigil.AI Raspberry v${VERSION}",
  "critical": false
}
EOF

echo "Creato: $OUT_DIR/$ARCHIVE"
[[ -n "$SHA" ]] && echo "SHA256: $SHA"
echo "Manifest: $OUT_DIR/version-${VERSION}.json"
