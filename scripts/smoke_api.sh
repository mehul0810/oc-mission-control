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

# Positive reads (core surfaces)
curl -fsS "$BASE_URL/api/v1/health" | jq -e '.data.status == "ok"' >/dev/null
curl -fsS "$BASE_URL/api/v1/agents" | jq -e '.data | type == "array" and length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/projects" | jq -e '.data | type == "array" and length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/tasks" | jq -e '.data | type == "array" and length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/dashboard/summary" | jq -e '.data.totals.tasks >= 1 and .data.tasks.todo >= 0' >/dev/null
curl -fsS "$BASE_URL/api/v1/dashboard/ownership-board" | jq -e '.data | type == "array" and length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/chat/messages" | jq -e '.data | type == "array"' >/dev/null
curl -fsS "$BASE_URL/api/v1/activity" | jq -e '.data | type == "array"' >/dev/null
curl -fsS "$BASE_URL/api/v2/command-center/summary" | jq -e '.data.kpis.activeItems >= 1 and (.data.riskLevel == "low" or .data.riskLevel == "medium" or .data.riskLevel == "high")' >/dev/null
curl -fsS "$BASE_URL/api/v2/work-items" | jq -e '.data | type == "array" and length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v2/work-items/task-1" | jq -e '.data.id == "task-1" and .data.state == "done"' >/dev/null

# Filtered endpoints
curl -fsS "$BASE_URL/api/v1/tasks?projectId=project-mc&status=todo" | jq -e '.data | map(select(.projectId == "project-mc" and .status == "todo")) | length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/dashboard/summary?agentId=agent-vision" | jq -e '.data.totals.tasks >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/dashboard/ownership-board?agentId=agent-shuri" | jq -e '.data | map(select(.agentName == "Shuri")) | length >= 1' >/dev/null
curl -fsS "$BASE_URL/api/v1/chat/messages?topic=general&q=mission" | jq -e '.data | type == "array"' >/dev/null

# 404 envelope
status_404="$(curl -s -o /tmp/oc_404.json -w '%{http_code}' "$BASE_URL/api/v1/does-not-exist")"
[[ "$status_404" == "404" ]] || { echo "Expected 404, got $status_404"; exit 1; }
jq -e '.error.code == "NOT_FOUND" and (.error.message | length > 0)' /tmp/oc_404.json >/dev/null

# Unauthorized write blocked
status_unauth="$(curl -s -o /tmp/oc_unauth.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/tasks" -H 'Content-Type: application/json' -d '{"title":"X"}')"
[[ "$status_unauth" == "401" ]] || { echo "Expected 401, got $status_unauth"; exit 1; }
jq -e '.error.code == "UNAUTHORIZED"' /tmp/oc_unauth.json >/dev/null

status_unauth_v2="$(curl -s -o /tmp/oc_unauth_v2.json -w '%{http_code}' -X POST "$BASE_URL/api/v2/work-items" -H 'Content-Type: application/json' -d '{"title":"X"}')"
[[ "$status_unauth_v2" == "401" ]] || { echo "Expected 401, got $status_unauth_v2"; exit 1; }
jq -e '.error.code == "UNAUTHORIZED"' /tmp/oc_unauth_v2.json >/dev/null

# Invalid payload checks (auth present)
status_validation_task="$(curl -s -o /tmp/oc_validation_task.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/tasks" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"title":"Missing refs"}')"
[[ "$status_validation_task" == "400" ]] || { echo "Expected 400, got $status_validation_task"; exit 1; }
jq -e '.error.code == "VALIDATION_ERROR"' /tmp/oc_validation_task.json >/dev/null

status_validation_chat="$(curl -s -o /tmp/oc_validation_chat.json -w '%{http_code}' -X POST "$BASE_URL/api/v1/chat/messages" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"topic":"general"}')"
[[ "$status_validation_chat" == "400" ]] || { echo "Expected 400, got $status_validation_chat"; exit 1; }
jq -e '.error.code == "VALIDATION_ERROR"' /tmp/oc_validation_chat.json >/dev/null

status_validation_agent="$(curl -s -o /tmp/oc_validation_agent.json -w '%{http_code}' -X PATCH "$BASE_URL/api/v1/agents/agent-jarvis/status" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"status":"unavailable"}')"
[[ "$status_validation_agent" == "400" ]] || { echo "Expected 400, got $status_validation_agent"; exit 1; }
jq -e '.error.code == "VALIDATION_ERROR"' /tmp/oc_validation_agent.json >/dev/null

status_validation_v2="$(curl -s -o /tmp/oc_validation_v2.json -w '%{http_code}' -X POST "$BASE_URL/api/v2/work-items" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"title":"x","projectId":"project-mc","ownerAgentId":"agent-peter","priority":"p9","effortPoints":20}')"
[[ "$status_validation_v2" == "400" ]] || { echo "Expected 400, got $status_validation_v2"; exit 1; }
jq -e '.error.code == "VALIDATION_ERROR"' /tmp/oc_validation_v2.json >/dev/null

# Mutation paths + downstream effects (activity/feed)
created_project_id="$(curl -fsS -X POST "$BASE_URL/api/v1/projects" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"name":"Wave2 QA Project","ownerAgentId":"agent-jarvis","status":"planning"}' | jq -r '.data.id')"
[[ "$created_project_id" =~ ^project- ]] || { echo "Project create failed"; exit 1; }

created_task_id="$(curl -fsS -X POST "$BASE_URL/api/v1/tasks" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d "{\"title\":\"Wave2 QA Task\",\"projectId\":\"$created_project_id\",\"agentId\":\"agent-vision\",\"status\":\"todo\",\"priority\":\"high\"}" | jq -r '.data.id')"
[[ "$created_task_id" =~ ^task- ]] || { echo "Task create failed"; exit 1; }

curl -fsS -X PATCH "$BASE_URL/api/v1/tasks/$created_task_id" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"status":"in_progress"}' | jq -e '.data.status == "in_progress"' >/dev/null

created_message_id="$(curl -fsS -X POST "$BASE_URL/api/v1/chat/messages" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"topic":"general","authorAgentId":"agent-jarvis","content":"Wave2 QA ping"}' | jq -r '.data.id')"
[[ "$created_message_id" =~ ^msg- ]] || { echo "Chat post failed"; exit 1; }

curl -fsS "$BASE_URL/api/v1/activity?type=chat&actorAgentId=agent-jarvis&limit=5" | jq -e '.data | map(select(.action == "posted")) | length >= 1' >/dev/null

created_work_item_id="$(curl -fsS -X POST "$BASE_URL/api/v2/work-items" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"title":"Wave2 Work Item","description":"Smoke create","projectId":"project-mc","ownerAgentId":"agent-peter","priority":"p1","effortPoints":5,"slaDueAt":"2026-05-20T12:00:00Z"}' | jq -r '.data.id')"
[[ "$created_work_item_id" =~ ^task- ]] || { echo "V2 work item create failed"; exit 1; }

curl -fsS "$BASE_URL/api/v2/work-items/$created_work_item_id" | jq -e '.data.id == "'"$created_work_item_id"'" and .data.state == "todo" and .data.priority == "p1"' >/dev/null

curl -fsS -X PATCH "$BASE_URL/api/v2/work-items/$created_work_item_id/transition" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"toState":"in_progress"}' | jq -e '.data.fromState == "todo" and .data.toState == "in_progress"' >/dev/null

status_invalid_transition="$(curl -s -o /tmp/oc_invalid_transition_v2.json -w '%{http_code}' -X PATCH "$BASE_URL/api/v2/work-items/$created_work_item_id/transition" -H 'Content-Type: application/json' -H "x-admin-key: $ADMIN_KEY" -d '{"toState":"todo"}')"
[[ "$status_invalid_transition" == "409" ]] || { echo "Expected 409, got $status_invalid_transition"; exit 1; }
jq -e '.error.code == "INVALID_TRANSITION"' /tmp/oc_invalid_transition_v2.json >/dev/null

# Audit explorer + CSV export parity
audit_from="2026-05-01T00:00:00Z"
audit_to="2026-05-31T23:59:59Z"
curl -fsS "$BASE_URL/api/v2/audit/events?actorId=agent-peter&entityType=task&action=updated&projectId=project-mc&from=$audit_from&to=$audit_to&limit=100" -o /tmp/oc_audit_filtered.json
jq -e '.data.items | type == "array"' /tmp/oc_audit_filtered.json >/dev/null
jq -e '.meta.count == (.data.items | length)' /tmp/oc_audit_filtered.json >/dev/null

curl -fsS "$BASE_URL/api/v2/audit/events/export?actorId=agent-peter&entityType=task&action=updated&projectId=project-mc&from=$audit_from&to=$audit_to" -o /tmp/oc_audit_filtered.csv
csv_rows=$(tail -n +2 /tmp/oc_audit_filtered.csv | sed '/^$/d' | awk 'END{print NR}')
json_rows=$(jq '.data.items | length' /tmp/oc_audit_filtered.json)
[[ "$csv_rows" == "$json_rows" ]] || { echo "Audit CSV/JSON parity mismatch: csv=$csv_rows json=$json_rows"; exit 1; }

head -n 1 /tmp/oc_audit_filtered.csv | grep -q '^id,occurredAt,actorId,entityType,entityId,action,projectId,summary$' || { echo "Unexpected audit CSV header"; exit 1; }

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

echo "API smoke/regression checks (Wave 2): PASS"
