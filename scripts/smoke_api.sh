#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PORT="${PORT:-4010}"
BASE_URL="http://127.0.0.1:${PORT}"
ADMIN_KEY="${MISSION_CONTROL_ADMIN_KEY:-mission-control-admin}"

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

for _ in {1..40}; do
  if curl -fsS "$BASE_URL/api/v1/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

# Positive reads
curl -fsS "$BASE_URL/api/v1/health" | jq -e '.data.status == "ok"' >/dev/null
curl -fsS "$BASE_URL/api/v1/agents" | jq -e '.data | type == "array" and length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/projects" | jq -e '.data | type == "array" and length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/tasks" | jq -e '.data | type == "array" and length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/dashboard/summary" | jq -e '.data.tasks.todo >= 0' >/dev/null
curl -fsS "$BASE_URL/api/v1/dashboard/ownership-board" | jq -e '.data | type == "array" and length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/chat/messages" | jq -e '.data | type == "array"' >/dev/null
curl -fsS "$BASE_URL/api/v1/activity" | jq -e '.data | type == "array"' >/dev/null

# 404 envelope
status_404="$(curl -s -o /tmp/oc_404.json -w '%{http_code}' "$BASE_URL/api/v1/does-not-exist")"
[[ "$status_404" == "404" ]] || { echo "Expected 404, got $status_404"; exit 1; }
jq -e '.error.code == "NOT_FOUND" and (.error.message | length > 0)' /tmp/oc_404.json >/dev/null

# Unauthorized write blocked
status_unauth="$(curl -s -o /tmp/oc_unauth.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/tasks" -H 'Content-Type: application/json' -d '{"title":"X"}')"
[[ "$status_unauth" == "401" ]] || { echo "Expected 401, got $status_unauth"; exit 1; }
jq -e '.error.code == "UNAUTHORIZED"' /tmp/oc_unauth.json >/dev/null

# Invalid payload with auth should fail 400 validation
status_validation="$(curl -s -o /tmp/oc_validation.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/tasks" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"title":"Missing refs"}')"
[[ "$status_validation" == "400" ]] || { echo "Expected 400, got $status_validation"; exit 1; }
jq -e '.error.code == "VALIDATION_ERROR"' /tmp/oc_validation.json >/dev/null

# Event stream endpoint accepts connection (SSE stays open; curl may timeout by design)
set +e
stream_headers="$(curl -sS -D - -o /dev/null --max-time 2 "$BASE_URL/api/v1/events/stream" 2>/dev/null)"
stream_rc=$?
set -e
[[ "$stream_headers" == *"HTTP/1.1 200"* ]] || { echo "Event stream did not connect (headers missing 200)"; exit 1; }
[[ "$stream_headers" == *"text/event-stream"* ]] || { echo "Event stream missing content-type"; exit 1; }
if [[ "$stream_rc" -ne 0 && "$stream_rc" -ne 28 ]]; then
  echo "Unexpected curl exit code on SSE check: $stream_rc"
  exit 1
fi

echo "API smoke/regression checks: PASS"
