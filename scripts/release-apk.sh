#!/usr/bin/env bash
# One-command APK release (free, no Play Store).
# Usage: ./scripts/release-apk.sh <x.y.z> [--notes "..."] [--mandatory] [--rollout 25] [--no-push]
# Steps: bump version -> local EAS build -> verify (aapt/apksigner) -> upload to GitHub Releases -> push manifest.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./scripts/release-apk.sh <x.y.z> [--notes ...] [--mandatory] [--rollout N] [--no-push]"
  exit 1
fi

VERSION="$1"; shift
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/../myanify-app"
OUT="/tmp/myanify_${VERSION}.apk"

cd "$ROOT"
echo "==> Bumping to $VERSION"
pnpm bump:mobile "$VERSION"

echo "==> Building APK locally"
cd "$APP_DIR"
eas build --platform android --profile production-apk --local --output "$OUT" --non-interactive

echo "==> Verifying"
if command -v aapt >/dev/null 2>&1; then
  aapt dump badging "$OUT" | head -n 1
else
  echo "(aapt not found, skipping badging check)"
fi
CERT_SHA=""
if command -v apksigner >/dev/null 2>&1; then
  apksigner verify --print-certs "$OUT" | head -n 5
  CERT_SHA="$(apksigner verify --print-certs "$OUT" 2>/dev/null | grep -i 'SHA-256' | head -n 1 | sed 's/.*: //' | tr -d ' :lower:' || true)"
else
  echo "(apksigner not found — install build-tools; skipping cert check)"
fi

echo "==> Uploading"
cd "$ROOT"
if [ -n "$CERT_SHA" ]; then
  pnpm upload:apk "$OUT" --cert-sha256 "$CERT_SHA" "$@"
else
  pnpm upload:apk "$OUT" "$@"
fi

echo "==> Done: $VERSION"
