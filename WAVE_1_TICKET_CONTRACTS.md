# Mission Control v2 — Wave 1 Ticket Contracts

Wave 1 objective: ship the v2 foundation slice with stable command/query contracts, event reliability, and release-ready quality gates.

---

## MC2-W1-001 — Event Envelope + Transactional Outbox
- **Owner:** Tony
- **Goal:** Guarantee durable, replayable event publication for all Wave 1 writes.
- **Scope In:** event envelope schema, `event_outbox` migration, outbox write in same DB transaction as domain write, relay worker scaffold.
- **Scope Out:** Kafka/queue infra, analytics sinks.
- **Acceptance Criteria:**
  1. Every `POST /api/v2/work-items` and transition write stores outbox event atomically.
  2. Event envelope includes `event_type`, `entity_type`, `entity_id`, `actor_id`, `occurred_at`, `payload`, `version`.
  3. Relay marks outbox rows as published idempotently.
  4. Contract test fails if write occurs without outbox row.
- **Changed files/areas:** backend migrations, `backend/src/services/events/*`, write route handlers.
- **Test Steps:** create + transition work item; verify DB outbox rows; run relay; confirm SSE emission.
- **Blockers:** none.
- **Next Action:** implement migration and serializer; open PR for Peter/Vision review.

## MC2-W1-002 — Work Item v2 Domain + Transition Rules
- **Owner:** Peter
- **Goal:** Introduce `work_items` model as canonical execution entity.
- **Scope In:** `work_items` schema/API, transition guard rules, v1 task adapter mapping.
- **Scope Out:** dependency graph, SLA alerting, bulk operations.
- **Acceptance Criteria:**
  1. `POST /api/v2/work-items` creates `todo` state by default.
  2. `PATCH /api/v2/work-items/:id/transition` enforces allowed transitions.
  3. Invalid transitions return `409 INVALID_TRANSITION`.
  4. v1 task endpoints still function via adapter.
- **Changed files/areas:** work-item routes/services, task adapter, DB migrations.
- **Test Steps:** run positive and negative transition tests; verify v1 endpoint compatibility smoke.
- **Blockers:** MC2-W1-001 contract shape required first.
- **Next Action:** stub route handlers from locked contract; pair with Tony on outbox hook.

## MC2-W1-003 — Query Read Models for Board + Summary
- **Owner:** Tony
- **Goal:** Provide fast, stable query APIs for initial v2 UI.
- **Scope In:** read model projection jobs, `GET /api/v2/execution/board`, `GET /api/v2/command-center/summary`, pagination/filter contract.
- **Scope Out:** advanced analytics and historical drilldowns.
- **Acceptance Criteria:**
  1. Board endpoint supports state/owner/project/priority filters.
  2. Summary endpoint returns active/blocked/overdue/overloaded KPIs.
  3. Query p95 targets met (board <=450ms, summary <=300ms on seeded data).
  4. Read model can be rebuilt from event log.
- **Changed files/areas:** query services, projection worker, DB indexes/views, API routes.
- **Test Steps:** seed data -> run projections -> compare API outputs -> run latency script + explain plans.
- **Blockers:** MC2-W1-001 and MC2-W1-002 required.
- **Next Action:** implement projection versioning and perf baseline capture.

## MC2-W1-004 — Frontend v2 Contract Integration (Shell + Board)
- **Owner:** Shuri
- **Goal:** Integrate app shell and board/table views with locked Wave 1 APIs.
- **Scope In:** app shell layout, board query adapter, filter synchronization, degraded-mode fallback for SSE drop.
- **Scope Out:** chat refactor, audit explorer UX.
- **Acceptance Criteria:**
  1. Board/table use only `/api/v2/execution/board` contract.
  2. Filter state is URL-synced and consistent across board/table.
  3. SSE disconnect shows visible degraded-state banner and polling fallback.
  4. No runtime crash on empty/error API responses.
- **Changed files/areas:** frontend app shell, work board/table components, API mappers.
- **Test Steps:** Chrome + Safari smoke; toggle filters; simulate backend restart; verify recovery.
- **Blockers:** MC2-W1-003 endpoint readiness.
- **Next Action:** start with mocked contract DTOs, then swap to live endpoints.

## MC2-W1-005 — Wave 1 QA Gate Package
- **Owner:** Vision
- **Goal:** Enforce release-quality evidence for Wave 1 completion.
- **Scope In:** API smoke, UI smoke, transition negative tests, envelope checks, perf sanity capture.
- **Scope Out:** full automated CI pipeline and load testing.
- **Acceptance Criteria:**
  1. QA checklist run with archived command output.
  2. No open Sev-1; Sev-2 requires explicit waiver.
  3. Contract envelope checks pass for success + error paths.
  4. Perf sanity thresholds captured and attached.
- **Changed files/areas:** `QA_CHECKLIST.md`, smoke scripts, QA evidence notes.
- **Test Steps:** run Gate 0-4 sequence from QA strategy; publish go/no-go note.
- **Blockers:** dependent on all prior Wave 1 ticket merges.
- **Next Action:** prepare evidence template and runbook before code freeze.

---

## Wave 1 Dependency Order
1. MC2-W1-001
2. MC2-W1-002
3. MC2-W1-003
4. MC2-W1-004 (parallel with late MC2-W1-003 once mocks are stable)
5. MC2-W1-005

## Wave 1 Release Risk Note
- **Current risk:** Medium
- **Primary risk drivers:** event/read-model drift, SSE instability, contract drift across FE/BE
- **Mitigation owner:** Tony (architecture), Vision (gate enforcement)
