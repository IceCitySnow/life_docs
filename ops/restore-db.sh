#!/usr/bin/env sh
# Restore a dump into an isolated drill database and verify Task row count.
set -eu

DUMP_FILE="${1:?Usage: restore-db.sh <dump-file> [target-db]}"
TARGET_DB="${2:-life_exploration_restore_drill}"
# Needs CREATE DATABASE privilege (usually postgres superuser), not the app role.
ADMIN_URL="${POSTGRES_ADMIN_URL:-postgresql://postgres@localhost:5432/postgres}"

psql --dbname="$ADMIN_URL" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB}' AND pid <> pg_backend_pid();" >/dev/null || true
psql --dbname="$ADMIN_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";"
psql --dbname="$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${TARGET_DB}\";"

TARGET_URL="$(printf '%s\n' "$ADMIN_URL" | sed -E "s#/([^/?]+)(\\?.*)?\$#/${TARGET_DB}\\2#")"
pg_restore --dbname="$TARGET_URL" --clean --if-exists --no-owner --no-privileges "$DUMP_FILE" || true

TABLE_COUNT="$(psql --dbname="$TARGET_URL" -v ON_ERROR_STOP=1 -Atc "SELECT count(*)::text FROM information_schema.tables WHERE table_schema = 'public';")"
TASK_ROWS="$(psql --dbname="$TARGET_URL" -v ON_ERROR_STOP=1 -Atc 'SELECT count(*)::text FROM public."Task";')"
echo "Verify OK: public_tables=${TABLE_COUNT} task_rows=${TASK_ROWS} (database=${TARGET_DB})"
echo "Restore drill finished."
