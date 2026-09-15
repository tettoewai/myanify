#!/usr/bin/env bash
# One-command APK release (free, no Play Store, no EAS).
# Usage: ./scripts/release-apk.sh <x.y.z> [--notes "..."] [--mandatory] [--rollout 25] [--no-push] [--no-git-push]
# Steps: bump version -> Expo prebuild -> local Gradle APK -> verify -> upload to GitHub Releases -> push manifest.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./scripts/release-apk.sh <x.y.z> [--notes ...] [--mandatory] [--rollout 25] [--no-push] [--no-git-push]"
  exit 1
fi

VERSION="$1"; shift
GIT_PUSH=true
UPLOAD_ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--no-git-push" ]; then
    GIT_PUSH=false
  else
    UPLOAD_ARGS+=("$arg")
  fi
done
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/../myanify-app"
OUT="/tmp/myanify_${VERSION}.apk"
APP_CONFIG="$APP_DIR/app.json"
CREDENTIALS="$APP_DIR/credentials.json"

fail() {
  echo "Release failed: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

require_command node
require_command pnpm
require_command gh
require_command java

[ -d "$APP_DIR" ] || fail "Mobile app directory not found: $APP_DIR"
[ -f "$APP_CONFIG" ] || fail "Expo app config not found: $APP_CONFIG"
[ -f "$CREDENTIALS" ] || fail "Missing $CREDENTIALS; configure production signing first."

if grep -q 'CHANGE_ME' "$CREDENTIALS"; then
  fail "Production credentials contain CHANGE_ME placeholders."
fi

KEYSTORE_PATH="$(node -e 'const c=require(process.argv[1]); process.stdout.write(c.android?.keystore?.keystorePath || "")' "$CREDENTIALS")"
STORE_PASSWORD="$(node -e 'const c=require(process.argv[1]); process.stdout.write(c.android?.keystore?.keystorePassword || "")' "$CREDENTIALS")"
KEY_ALIAS="$(node -e 'const c=require(process.argv[1]); process.stdout.write(c.android?.keystore?.keyAlias || "")' "$CREDENTIALS")"
KEY_PASSWORD="$(node -e 'const c=require(process.argv[1]); process.stdout.write(c.android?.keystore?.keyPassword || "")' "$CREDENTIALS")"
[ -n "$KEYSTORE_PATH" ] && [ -n "$STORE_PASSWORD" ] && [ -n "$KEY_ALIAS" ] && [ -n "$KEY_PASSWORD" ] || fail "Invalid Android keystore configuration in $CREDENTIALS."

KEYSTORE_SOURCE="$APP_DIR/$KEYSTORE_PATH"
[ -f "$KEYSTORE_SOURCE" ] || fail "Keystore not found: $KEYSTORE_SOURCE"
TEMP_KEYSTORE="/tmp/myanify-release.keystore"
trap 'rm -f "$TEMP_KEYSTORE"' EXIT

if ! git -C "$APP_DIR" diff --quiet -- app.json package.json; then
  fail "Mobile version files have local changes; commit or stash them before releasing."
fi

if [ -d "$APP_DIR/android" ]; then
  if git -C "$APP_DIR" check-ignore -q android; then
    cp "$KEYSTORE_SOURCE" "$TEMP_KEYSTORE"
    rm -rf "$APP_DIR/android"
  else
    echo "Refusing to remove tracked android/ directory. Clean or update native metadata manually."
    exit 1
  fi
fi

cd "$ROOT"
CURRENT_VERSION="$(node -e 'const c=require(process.argv[1]); process.stdout.write(c.expo?.version || "")' "$APP_CONFIG")"
if [ "$CURRENT_VERSION" = "$VERSION" ]; then
  echo "==> Version already set to $VERSION; reusing it for this retry"
else
  echo "==> Bumping to $VERSION"
  pnpm bump:mobile "$VERSION"
fi

echo "==> Generating Android project locally"
cd "$APP_DIR"
CI=1 pnpm exec expo prebuild --platform android --no-install

mkdir -p "$(dirname "$KEYSTORE_SOURCE")"
cp "$TEMP_KEYSTORE" "$KEYSTORE_SOURCE"

GENERATED_GRADLE="$APP_DIR/android/app/build.gradle"
[ -f "$GENERATED_GRADLE" ] || fail "Expo prebuild did not generate $GENERATED_GRADLE"

echo "==> Configuring production signing"
node - "$GENERATED_GRADLE" <<'NODE'
const fs = require("fs");
const path = process.argv[2];
let source = fs.readFileSync(path, "utf8");
if (!source.includes("signingConfigs.release")) {
  source = source.replace(
    /signingConfigs \{\n\s*debug \{[\s\S]*?\n\s*\}\n\s*\}/,
    `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file(findProperty('MYANIFY_RELEASE_STORE_FILE'))
            storePassword findProperty('MYANIFY_RELEASE_STORE_PASSWORD')
            keyAlias findProperty('MYANIFY_RELEASE_KEY_ALIAS')
            keyPassword findProperty('MYANIFY_RELEASE_KEY_PASSWORD')
        }
    }`,
  );
  source = source.replace(
    /release \{\n\s*\/\/ Caution![\s\S]*?\n\s*signingConfig signingConfigs\.debug/,
    "release {\n            signingConfig signingConfigs.release",
  );
}
if (!source.includes("signingConfigs.release")) {
  throw new Error("Could not configure signingConfigs.release in generated Gradle file");
}
fs.writeFileSync(path, source);
NODE

echo "==> Building APK locally with Gradle"
rm -f "$OUT"
ORG_GRADLE_PROJECT_MYANIFY_RELEASE_STORE_FILE="$KEYSTORE_SOURCE" \
ORG_GRADLE_PROJECT_MYANIFY_RELEASE_STORE_PASSWORD="$STORE_PASSWORD" \
ORG_GRADLE_PROJECT_MYANIFY_RELEASE_KEY_ALIAS="$KEY_ALIAS" \
ORG_GRADLE_PROJECT_MYANIFY_RELEASE_KEY_PASSWORD="$KEY_PASSWORD" \
  ./android/gradlew -p android assembleRelease --no-daemon

BUILT_APK="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
[ -s "$BUILT_APK" ] || fail "Gradle did not produce $BUILT_APK"
cp "$BUILT_APK" "$OUT"

echo "==> Verifying"
if command -v aapt >/dev/null 2>&1; then
  aapt dump badging "$OUT" | head -n 1
else
  echo "(aapt not found, skipping badging check)"
fi
CERT_SHA=""
if command -v apksigner >/dev/null 2>&1; then
  apksigner verify --print-certs "$OUT" | head -n 5
  CERT_SHA="$(apksigner verify --print-certs "$OUT" 2>/dev/null | grep -i 'SHA-256' | head -n 1 | sed 's/.*: //' | tr -d ' :' | tr '[:upper:]' '[:lower:]' || true)"
else
  echo "(apksigner not found — install build-tools; skipping cert check)"
fi

echo "==> Uploading"
cd "$ROOT"
if [ -n "$CERT_SHA" ]; then
  pnpm upload:apk "$OUT" --cert-sha256 "$CERT_SHA" "${UPLOAD_ARGS[@]}"
else
  pnpm upload:apk "$OUT" "${UPLOAD_ARGS[@]}"
fi

if [ "$GIT_PUSH" = true ]; then
  echo "==> Committing release metadata"
  git -C "$APP_DIR" add app.json package.json
  git -C "$APP_DIR" diff --cached --quiet || git -C "$APP_DIR" commit -m "chore: release mobile $VERSION"

  git -C "$ROOT" add mobile-release.json
  git -C "$ROOT" diff --cached --quiet || git -C "$ROOT" commit -m "chore: publish mobile release $VERSION"

  echo "==> Pushing release commits"
  git -C "$APP_DIR" push origin HEAD
  git -C "$ROOT" push origin HEAD
else
  echo "==> Skipping Git pushes (--no-git-push)"
fi

echo "==> Done: $VERSION"
