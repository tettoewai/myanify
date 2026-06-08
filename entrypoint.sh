#!/bin/bash
set -e

SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
BUCKET="typesense-backup"
DATA_DIR="/data"
BACKUP_FILE="/tmp/typesense-backup.tar.gz"

# Restore from Supabase
echo "==> Attempting to restore backup from Supabase..."
if curl -s -f -o "$BACKUP_FILE" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/storage/v1/object/public/$BUCKET/typesense-data.tar.gz"; then
    echo "Backup found. Restoring..."
    tar -xzf "$BACKUP_FILE" -C /
    rm "$BACKUP_FILE"
else
    echo "No existing backup — starting fresh."
fi

# Background: create & upload backup every 10 minutes
backup_and_upload() {
  while true; do
    sleep 600
    echo "==> Creating backup archive..."
    tar -czf "$BACKUP_FILE" -C / data
    echo "==> Uploading to Supabase..."
    curl -X POST \
      -H "apikey: $SUPABASE_ANON_KEY" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      -H "Content-Type: application/tar+gzip" \
      --data-binary "@$BACKUP_FILE" \
      "$SUPABASE_URL/storage/v1/object/$BUCKET/typesense-data.tar.gz"
    rm "$BACKUP_FILE"
  done
}
backup_and_upload &

# Start Typesense
exec /opt/typesense-server \
  --data-dir="$DATA_DIR" \
  --api-key="$TYPESENSE_API_KEY" \
  --enable-cors \
  --port=8108