#!/usr/bin/env sh
set -eu
BASE_URL="${1:-http://127.0.0.1:3000/api/v1}"
BASE_URL="${BASE_URL%/}"

echo "[CHECK] health ..."
curl -fsS "$BASE_URL/health" | grep -q '"status":"ok"'
echo "[OK]    health"

echo "[CHECK] categories ..."
curl -fsS "$BASE_URL/categories" | grep -q '"data"'
echo "[OK]    categories"

echo "[CHECK] tasks ..."
curl -fsS "$BASE_URL/tasks?page=1&pageSize=5" | grep -q '"pagination"'
echo "[OK]    tasks"

echo
echo "Smoke passed against $BASE_URL"
