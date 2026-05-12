# Mission Control v2 — Wave 1 Architecture Lock (Tony)

## Purpose
Lock the v2 foundation architecture and API contracts for Wave 1 so backend/frontend/QA can execute in parallel with minimal churn.

## Wave 1 Scope (locked)
- Event contract + transactional outbox
- Work item v2 domain (task compatibility adapter)
- Command/query API boundary for v2 foundation
- Baseline read model projection for command center summary + execution board

Out of scope for Wave 1:
- Full collaboration decision system
- Audit explorer UI/export
- SLA/escalation automation
- Multi-tenant auth/RBAC

---

## 1) Architecture Lock

## 1.1 Runtime shape
- **Write path (commands):** HTTP -> validation -> domain service -> DB transaction -> outbox row (same transaction)
- **Publish path:** outbox relay -> SSE topics (`ops`, `board`, `agent`, `audit`) 
- **Read path (queries):** HTTP -> query service -> read models/materialized views
- **Fallback:** query polling if SSE unavailable

## 1.2 Hard invariants
1. No state-changing API may commit without writing an outbox event.
2. `work_items` is the source of truth for execution states.
3. State transitions are server-enforced; client cannot skip rules.
4. Read models are rebuildable from event log + current schema version.
5. v1 task endpoints remain functional via adapter until deprecation notice.

## 1.3 Canonical state model
`todo -> in_progress -> blocked -> done`

Allowed transitions:
- `todo -> in_progress | blocked`
- `in_progress -> blocked | done`
- `blocked -> in_progress | done`
- `done -> in_progress` (re-open only with `reason`)

---

## 2) API Contract Lock (Wave 1)

All responses use envelope:
- success: `{ "data": ..., "meta"?: ... }`
- error: `{ "error": { "code": "...", "message": "...", "details"?: ... } }`

## 2.1 `POST /api/v2/work-items`
Creates a work item.

Request:
```json
{
  "title": "Implement outbox relay",
  "description": "...",
  "projectId": "uuid",
  "ownerAgentId": "uuid",
  "priority": "p0",
  "effortPoints": 5,
  "slaDueAt": "2026-05-20T12:00:00Z"
}
```

Validation:
- `title` required (3-160 chars)
- `priority` in `p0|p1|p2|p3`
- `effortPoints` integer `1..13`

Success (201):
```json
{
  "data": {
    "id": "uuid",
    "state": "todo",
    "createdAt": "ISO-8601"
  }
}
```

## 2.2 `PATCH /api/v2/work-items/:id/transition`
Transitions a work item state.

Request:
```json
{
  "toState": "blocked",
  "reason": "Waiting on schema approval"
}
```

Rules:
- invalid transition -> `409 INVALID_TRANSITION`
- `done -> in_progress` requires `reason`

Success (200):
```json
{
  "data": {
    "id": "uuid",
    "fromState": "in_progress",
    "toState": "blocked",
    "updatedAt": "ISO-8601"
  }
}
```

## 2.3 `GET /api/v2/execution/board`
Query work items for board/table UI.

Query params:
- `state?`, `ownerAgentId?`, `projectId?`, `priority?`, `cursor?`, `limit?`

Success (200):
```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "...",
        "state": "blocked",
        "priority": "p1",
        "ownerAgent": { "id": "uuid", "name": "Peter" },
        "blockerReason": "Awaiting API contract"
      }
    ]
  },
  "meta": {
    "nextCursor": "opaque",
    "count": 25
  }
}
```

## 2.4 `GET /api/v2/command-center/summary`
Aggregated operational snapshot.

Success (200):
```json
{
  "data": {
    "kpis": {
      "activeItems": 18,
      "blockedItems": 4,
      "overdueItems": 2,
      "overloadedAgents": 1
    },
    "riskLevel": "medium",
    "generatedAt": "ISO-8601"
  }
}
```

## 2.5 SSE `GET /events/stream`
- Supports `Last-Event-ID` resume
- Event envelope:
```json
{
  "eventId": "uuid",
  "topic": "board",
  "eventType": "work_item.transitioned",
  "occurredAt": "ISO-8601",
  "payload": {}
}
```

---

## 3) Data Contract Lock (Wave 1)

Required tables for Wave 1:
- `work_items`
- `event_outbox`
- `event_log`
- `read_model_execution_board`
- `read_model_command_center_summary`

Minimum indexes:
- `work_items(state, priority, sla_due_at)`
- `work_items(owner_agent_id, state)`
- `event_outbox(published_at, created_at)`
- `event_log(entity_type, entity_id, occurred_at desc)`

---

## 4) Security and Performance Standards (must pass)

## Security
1. All mutating `/api/v2/*` routes require admin key/session.
2. Input schema validation at route edge; no direct raw payload usage.
3. Actor attribution required for every write event (`actor_id` mandatory).
4. Audit-safe logs: do not log secrets/admin key values.
5. Idempotency key support for create/transition endpoints (header-based).

## Performance
1. `GET /api/v2/command-center/summary` p95 <= 300ms (dev seeded dataset).
2. `GET /api/v2/execution/board` p95 <= 450ms.
3. Outbox relay lag <= 2s p95 under normal load.
4. No full table scan on board/summary hot paths (`EXPLAIN` verified).

---

## 5) Phased Rollout Notes

## Phase A — Dark launch (internal only)
- Deploy schema + APIs behind flags.
- Verify dual-read parity against v1 dashboard numbers.
- Keep v2 UI hidden.

## Phase B — Controlled enablement
- Enable `MC_V2_EXECUTION_BOARD` for internal users.
- Monitor API latency + SSE disconnect rate + outbox lag.
- Roll back by feature flag only (no emergency schema rollback).

## Phase C — Command center exposure
- Enable `MC_V2_COMMAND_CENTER` summary modules.
- Keep v1 endpoints active during stabilization window.
- Run QA Gate 0-4 from `QA_RELEASE_STRATEGY_V2.md` before broader rollout.

## Rollback strategy
- Disable feature flags first.
- Keep write path stable; avoid destructive rollback migrations.
- Replay read models from `event_log` after fix if drift detected.

---

## 6) Sign-off criteria (architecture lock complete)
- API contracts above accepted by Peter + Shuri + Vision.
- Transition rules implemented with contract tests.
- Outbox transaction invariant enforced in code review.
- Security/performance thresholds tracked in QA evidence.
