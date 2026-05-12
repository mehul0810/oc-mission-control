#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
API_PORT="${API_PORT:-4010}"
UI_PORT="${UI_PORT:-3001}"
API_URL="http://127.0.0.1:${API_PORT}"
UI_URL="http://127.0.0.1:${UI_PORT}"

cleanup() {
  for pid in "${UI_PID:-}" "${API_PID:-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT

cd "$BACKEND_DIR"
npm run build >/dev/null
PORT="$API_PORT" node dist/server.js >/tmp/mission-control-ui-api.log 2>&1 &
API_PID=$!

for _ in {1..40}; do
  if curl -fsS "$API_URL/api/v1/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

cd "$FRONTEND_DIR"
npm run build >/tmp/mission-control-ui-build.log 2>&1
PORT="$UI_PORT" NEXT_PUBLIC_API_BASE_URL="$API_URL" npm run start >/tmp/mission-control-ui.log 2>&1 &
UI_PID=$!

for _ in {1..80}; do
  if curl -fsS "$UI_URL" >/tmp/oc_ui.html 2>/dev/null; then
    break
  fi
  sleep 0.5
done

grep -q "<!DOCTYPE html" /tmp/oc_ui.html || {
  echo "Frontend root did not return HTML"
  exit 1
}

for token in \
  "Command Center" \
  "Execution Board" \
  "Bottleneck Radar" \
  "Agent Health Pulse" \
  "Quick Add Task" \
  "Watercooler Chat" \
  "Activity Timeline"; do
  grep -q "$token" "$FRONTEND_DIR/app/page.tsx" || {
    echo "Missing expected UI slice in app/page.tsx: $token"
    exit 1
  }
done

echo "UI smoke checks (Wave 2 slices): PASS"