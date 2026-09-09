#!/usr/bin/env bash
set -e

# pre-push hook: build & push ghcr.io/tettoewai/myanify:latest before pushing to main
# Installed at .git/hooks/pre-push (not tracked). Versioned copy at scripts/pre-push-hook.sh
# Bypass: SKIP_DOCKER_BUILD=1 git push  OR  git push --no-verify

REMOTE="$1"
URL="$2"

# If explicitly skipped, allow push
if [ "${SKIP_DOCKER_BUILD:-}" = "1" ]; then
  echo "[pre-push] SKIP_DOCKER_BUILD=1 — skipping docker build/push"
  exit 0
fi

# Read stdin lines: <local ref> <local sha> <remote ref> <remote sha>
SHOULD_BUILD=0
while read -r local_ref local_sha remote_ref remote_sha; do
  # local_ref like refs/heads/main, remote_ref like refs/heads/main
  if [ "$remote_ref" = "refs/heads/main" ]; then
    # also handle deletes: local_sha = 000... means delete, skip
    if [ "$local_sha" != "0000000000000000000000000000000000000000" ]; then
      SHOULD_BUILD=1
    fi
  fi
done

if [ "$SHOULD_BUILD" -eq 0 ]; then
  exit 0
fi

echo "[pre-push] Pushing to main detected (remote=$REMOTE) — building Docker image..."

# Ensure we're at repo root
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

# Check docker
if ! command -v docker >/dev/null 2>&1; then
  echo "[pre-push] ERROR: docker not found. Install docker or bypass with SKIP_DOCKER_BUILD=1 git push / --no-verify"
  exit 1
fi

# Optional: auto-login to ghcr.io if not logged in
# Try gh auth token, then GITHUB_TOKEN env
if ! docker system info >/dev/null 2>&1; then
  echo "[pre-push] ERROR: docker daemon not running"
  exit 1
fi

# Check if we can push to ghcr — if `docker login ghcr.io` not done, try to login via `gh`
if ! grep -q "ghcr.io" ~/.docker/config.json 2>/dev/null; then
  echo "[pre-push] Not logged into ghcr.io, attempting 'gh auth token | docker login ghcr.io -u <user> --password-stdin'..."
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    GH_USER="$(gh api user --jq .login 2>/dev/null || echo "tettoewai")"
    echo "[pre-push] Logging in as $GH_USER via gh"
    gh auth token | docker login ghcr.io -u "$GH_USER" --password-stdin || {
      echo "[pre-push] gh login failed. Run: echo \$GITHUB_TOKEN | docker login ghcr.io -u <github-username> --password-stdin"
      exit 1
    }
  elif [ -n "${GITHUB_TOKEN:-}" ]; then
    echo "[pre-push] Logging in via GITHUB_TOKEN env"
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "${GITHUB_ACTOR:-tettoewai}" --password-stdin || exit 1
  else
    echo "[pre-push] WARNING: not logged into ghcr.io. Push will likely fail. Run:"
    echo "  gh auth login && gh auth token | docker login ghcr.io -u \$(gh api user --jq .login) --password-stdin"
    echo "  or: echo \$GITHUB_TOKEN | docker login ghcr.io -u tettoewai --password-stdin"
  fi
fi

echo "[pre-push] Running:"
echo "  docker build --platform linux/amd64 --build-arg NEXT_PUBLIC_APP_URL=\"https://myanify.tettoewai.com\" -t ghcr.io/tettoewai/myanify:latest ."

docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_APP_URL="https://myanify.tettoewai.com" \
  -t ghcr.io/tettoewai/myanify:latest .

echo "[pre-push] Pushing ghcr.io/tettoewai/myanify:latest ..."
docker push ghcr.io/tettoewai/myanify:latest

echo "[pre-push] Done — proceeding with git push"
