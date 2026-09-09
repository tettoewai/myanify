#!/usr/bin/env bash
# Install a host cron job that periodically cleans up unverified accounts
# by hitting the internal maintenance endpoint on the running container.
#
# Run this ON THE VPS (not locally). It reads CRON_SECRET from ~/myanify/.env
# and adds a crontab entry that POSTs to the app on localhost:3000.
#
#   Usage: bash scripts/install-cleanup-cron.sh
set -euo pipefail

ENV_FILE="$HOME/myanify/.env"
CRON_ENTRY_FILE="/etc/cron.d/myanify-cleanup"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Run this on the VPS where myanify is deployed."
  exit 1
fi

SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"' || true)"
if [[ -z "$SECRET" || "$SECRET" == "change-me" ]]; then
  echo "ERROR: set a real CRON_SECRET in $ENV_FILE (e.g. openssl rand -hex 24)."
  exit 1
fi

# Run example: once per day at 04:17. Adjust as needed.
echo "0 4 * * * root curl -sf -o /dev/null -X POST -H \"Authorization: Bearer $SECRET\" http://127.0.0.1:3000/api/cron/cleanup-users" > "$CRON_ENTRY_FILE"

chmod 0644 "$CRON_ENTRY_FILE"

if command -v crond >/dev/null 2>&1; then
  # Alpine (crond) — ensure it's running.
  touch /etc/crontabs/root >/dev/null 2>&1 || true
else
  systemctl restart cron 2>/dev/null || service cron restart 2>/dev/null || true
fi

echo "Cron installed at $CRON_ENTRY_FILE: runs daily at 04:17."
echo "Test now:"
curl -s -X POST \
  -H "Authorization: Bearer $SECRET" \
  http://127.0.0.1:3000/api/cron/cleanup-users || echo " (container not reachable — is it running?)"
