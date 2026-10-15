#!/usr/bin/env sh
# Create a PostgreSQL logical backup (pg_dump custom format).
set -eu

DATABASE_URL="${DATABASE_URL:-postgresql://life_exploration:life_exploration_dev@localhost:5432/life_exploration}"
OUT_DIR="${OUT_DIR:-$(cd "$(dirname "$0")" && pwd)/backups}"
mkdir -p "$OUT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/life_exploration-$STAMP.dump"

echo "Backing up to $OUT_FILE"
pg_dump --dbname="$DATABASE_URL" --format=custom --file="$OUT_FILE"
echo "Backup complete: $OUT_FILE"
echo "$OUT_FILE"
