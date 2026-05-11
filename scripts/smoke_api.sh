#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PORT="${PORT:-4010}"
BASE_URL="http://127.0.0.1:${PORT}"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

cd "$BACKEND_DIR"
npm run build >/dev/null
PORT="$PORT" node dist/server.js >/tmp/mission-control-api.log 2>&1 &
SERVER_PID=$!

for _ in {1..30}; do
  if curl -fsS "$BASE_URL/api/v1/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

curl -fsS "$BASE_URL/api/v1/health" | jq -e '.data.status == "ok"' >/dev/null
curl -fsS "$BASE_URL/api/v1/agents" | jq -e '.data | length >= 6' >/dev/null
curl -fsS "$BASE_URL/api/v1/projects" | jq -e '.data | length >= 3' >/dev/null
curl -fsS "$BASE_URL/api/v1/tasks" | jq -e '.data | length >= 18' >/dev/null
curl -fsS "$BASE_URL/api/v1/dashboard/summary" | jq -e '.data.tasks.todo >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/dashboard/ownership-board" | jq -e '.data | length >= 18' >/dev/null

echo "API smoke checks: PASS"
