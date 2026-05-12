# Mission Control v2 — Wave 2 Architecture Lock (Tony)

## Purpose
Lock Wave 2 contracts for collaboration, decisioning, dependency risk propagation, and audit explorer so Peter/Shuri/Vision can execute with minimal churn.

## Wave 2 Scope (locked)
- Collaboration threads + message model with mentions
- Decision lifecycle and ownership
- Work-item dependency graph APIs and blocker propagation read model
- Audit explorer query/export contract
- Incremental rollout on top of Wave 1 foundations

Out of scope for Wave 2:
- File attachments
- Multi-tenant RBAC redesign
- SLA/alert rule engine automation (Wave 3)
- Warehouse/offline analytics pipelines

---

## 1) Architecture Lock

### 1.1 Runtime shape
- **Write path:** `/api/v2/collab/*`, `/api/v2/decisions/*`, `/api/v2/work-items/*/dependencies` -> validation -> domain services -> DB transaction -> outbox row.
- **Projection path:** outbox relay updates read models:
  - `read_model_collab_feed`
  - `read_model_dependency_risk`
  - `read_model_audit_explorer`
- **Realtime topics:** reuse SSE `/events/stream` with topics `chat`, `board`, `audit`.
- **Fallback:** query polling + cursor resume when SSE disconnects.

### 1.2 Hard invariants
1. Every Wave 2 write emits versioned event envelope in same transaction.
2. `decisions` must be linked to exactly one thread (`thread_id` required).
3. Dependency graph must reject cycles at write time.
4. Audit rows are append-only (`insert only`; no update/delete paths).
5. Read models remain replayable from `event_log` + projection version.

---

## 2) State Contracts (locked)

### 2.1 Decision lifecycle
`open -> decided -> superseded`

Allowed transitions:
- `open -> decided | superseded`
- `decided -> superseded`

Rules:
- `decided` requires `resolution` text and `decidedByAgentId`.
- `superseded` requires `supersededByDecisionId`.
- Transition violation returns `409 INVALID_DECISION_TRANSITION`.

### 2.2 Work item blocker semantics (Wave 2 extension)
- `POST /api/v2/work-items/:id/dependencies` does not change state directly.
- If any dependency target is in `blocked`, dependent item returns computed `isBlockedByDependency=true` in board/graph queries.
- Manual state transition to `done` rejected when unresolved hard dependency exists (`409 BLOCKED_BY_DEPENDENCY`).

---

## 3) API Contract Lock (Wave 2)

All responses use Wave 1 envelope:
- success: `{ "data": ..., "meta"?: ... }`
- error: `{ "error": { "code": "...", "message": "...", "details"?: ... } }`

### 3.1 `POST /api/v2/collab/messages`
Creates thread-aware message.

Request:
```json
{
  "threadId": "uuid",
  "projectId": "uuid",
  "body": "Need architecture sign-off @tony",
  "mentions": ["agent_uuid_tony"]
}
```

Validation:
- `body` required (1..5000 chars)
- `mentions` max 20 agents

Success (201):
```json
{
  "data": {
    "id": "uuid",
    "threadId": "uuid",
    "createdAt": "ISO-8601"
  }
}
```

### 3.2 `POST /api/v2/decisions`
Creates or transitions decision entry.

Create request:
```json
{
  "threadId": "uuid",
  "projectId": "uuid",
  "title": "Adopt outbox relay retry policy",
  "context": "...",
  "ownerAgentId": "uuid"
}
```

Transition request (`PATCH /api/v2/decisions/:id/transition`):
```json
{
  "toState": "decided",
  "resolution": "Retry with exp backoff, cap 5m",
  "decidedByAgentId": "uuid"
}
```

### 3.3 `POST /api/v2/work-items/:id/dependencies`
Links dependency edge.

Request:
```json
{
  "dependsOnWorkItemId": "uuid",
  "dependencyType": "hard"
}
```

Rules:
- `dependencyType` in `hard|soft`
- reject self-edge and cycles (`409 DEPENDENCY_CYCLE`)

### 3.4 `GET /api/v2/execution/dependencies/:id`
Returns upstream/downstream dependency graph slice.

Success (200):
```json
{
  "data": {
    "workItemId": "uuid",
    "blocked": true,
    "blockedBy": [{ "id": "uuid", "state": "blocked" }],
    "downstream": [{ "id": "uuid", "state": "todo" }]
  }
}
```

### 3.5 `GET /api/v2/audit/events`
Advanced audit filtering with keyset pagination.

Query params:
- `actorId?`, `entityType?`, `entityId?`, `action?`, `projectId?`, `from?`, `to?`, `cursor?`, `limit?`

Success (200):
```json
{
  "data": { "items": [] },
  "meta": { "nextCursor": "opaque", "count": 50 }
}
```

### 3.6 `GET /api/v2/audit/events/export`
Exports exactly current filtered view.

Response:
- `text/csv` stream
- stable column ordering
- max export window 31 days per request

---

## 4) Data Contract Lock (Wave 2)

Required tables:
- `collab_threads`
- `collab_messages`
- `decisions`
- `work_item_dependencies`
- `audit_events`
- `read_model_collab_feed`
- `read_model_dependency_risk`
- `read_model_audit_explorer`

Required indexes:
- `collab_messages(thread_id, created_at desc)`
- `decisions(thread_id, status, created_at desc)`
- `work_item_dependencies(work_item_id, depends_on_work_item_id)` unique
- `audit_events(project_id, occurred_at desc)`
- `audit_events(actor_id, occurred_at desc)`

---

## 5) Security + Performance Standards (must pass)

### Security
1. All mutating Wave 2 routes require authenticated actor context.
2. Mention targets validated against known agents.
3. Audit export permission matches audit read permission.
4. Decision transition actor recorded on every mutation.

### Performance
1. `GET /api/v2/audit/events` p95 <= 500ms on 100k event fixture.
2. `GET /api/v2/execution/dependencies/:id` p95 <= 350ms on 10k edges fixture.
3. `POST /api/v2/collab/messages` write latency p95 <= 250ms.
4. Projection lag for chat/dependency read models <= 3s p95.

---

## 6) Rollout Plan (locked)

### Phase A — Dark launch
- Ship schema + APIs behind flags:
  - `MC_V2_COLLAB_THREADS`
  - `MC_V2_AUDIT_EXPLORER`
  - `MC_V2_DEPENDENCY_GRAPH`
- Backfill read models from existing event log.

### Phase B — Internal enablement
- Enable collaboration + decisions first.
- Validate decision transition integrity and event parity.

### Phase C — Dependency + audit activation
- Enable dependency graph and audit explorer.
- Run Wave 2 QA gate before broad rollout.

Rollback:
- Disable flags first.
- Keep write-path schema intact.
- Replay projections after fixes if drift detected.

---

## 7) Sign-off criteria (Wave 2 lock complete)
- Peter accepts endpoint contracts and transition rules.
- Shuri accepts response DTOs and pagination/filter behavior.
- Vision approves QA gate mapping to locked performance/security thresholds.
- Tony confirms cycle detection, append-only audit invariants, and outbox coupling.