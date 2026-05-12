# Mission Control v2 — Architecture, Backlog, Data Model, Risk Register

> Wave 1 architecture/API lock and contract-complete execution tickets are captured in:
> - `V2_FOUNDATION_ARCHITECTURE_LOCK.md`
> - `WAVE_1_TICKET_CONTRACTS.md`

## 1) Architecture v2 Proposal (implementation-ready)

## Product intent (v2)
Upgrade MVP into an operations command center inspired by missioncontrolhq.ai:
- live agent visibility
- execution pipeline clarity
- collaborative chat + decision capture
- complete activity/audit trail
- fast operator actions from one screen

## Architecture principles
1. **Event-first state:** Every meaningful change emits an event and updates read models.
2. **Separation of write/read paths:** Command APIs mutate; query APIs power dashboards.
3. **Realtime by default, poll fallback:** SSE/WebSocket push with resilient refresh.
4. **Operator UX latency target:** p95 < 300ms for dashboard queries.
5. **Auditability:** Actions traceable to actor, target, reason, and before/after snapshot refs.

## v2 system layout
- **Frontend (Next.js App Router):**
  - Command Center (global status + incidents)
  - Agent Ops (agent cards, workload, activity)
  - Execution Board (work items by lifecycle)
  - Collaboration (chat + decision threads)
  - Audit Explorer (filters, export)
- **Backend (Node + Express existing base):**
  - `command` routes (write ops)
  - `query` routes (dashboard/read models)
  - domain services + event publisher
- **Data layer (Postgres):**
  - normalized operational tables
  - append-only event log
  - denormalized read-model/materialized views
- **Realtime transport:**
  - keep SSE stream (`/events/stream`) and add channelized topics (`ops`, `agent`, `board`, `chat`, `audit`)
- **Async workers (lightweight):**
  - projection updater for read models
  - SLA/deadline breach detector

## Bounded contexts
1. **Identity & Agents** (agents, capacity, presence)
2. **Execution** (projects, work items, assignments, dependencies, blockers)
3. **Collaboration** (channels, messages, thread decisions, mentions)
4. **Observability & Audit** (activity events, timeline, alerts)

## Deployment posture (fast iteration)
- Keep monorepo and existing backend/frontend split.
- Add v2 under feature flags:
  - `MC_V2_COMMAND_CENTER`
  - `MC_V2_EXECUTION_BOARD`
  - `MC_V2_AUDIT_EXPLORER`
- Ship vertical slices weekly; no full rewrite cutover.

---

## 2) Prioritized Technical Backlog (ticket contract format)

### P0-1 — Event Contract + Outbox Foundation
- **Owner:** Tony
- **Goal:** Establish reliable event publishing and common event schema for all v2 modules.
- **Scope in:** Event envelope, outbox table, publisher service, replay-safe consumer scaffold.
- **Scope out:** Full analytics pipeline.
- **Acceptance criteria:**
  - Event envelope versioned (`event_type`, `entity_type`, `entity_id`, `actor_id`, `occurred_at`, `payload`).
  - Any write to task/chat/activity persists outbox row in same transaction.
  - Replay script can rebuild one read model from events.
- **Changed files/areas:** `backend/src/services/events/*`, `backend/src/routes/*`, DB migrations.
- **Test steps:** Create/update task; verify outbox row + published stream event; replay projection test passes.
- **Blockers:** None.
- **Next action:** Implement migration + shared event serializer.

### P0-2 — Unified Work Item Model (Task → Work Item v2)
- **Owner:** Peter
- **Goal:** Replace narrow task shape with richer execution object.
- **Scope in:** `work_items` table/API, lifecycle states, priority/SLA/deadline fields.
- **Scope out:** Multi-tenant permissions.
- **Acceptance criteria:**
  - CRUD for `work_items` with state transitions validated server-side.
  - Existing task endpoints mapped for backward compatibility.
  - Ownership board uses `work_items` query source.
- **Changed files/areas:** `backend/src/routes/tasks*` (adapter), new `backend/src/routes/work-items*`, DB migrations.
- **Test steps:** Create work item, move through states, confirm board reflects transitions.
- **Blockers:** P0-1 event contract required.
- **Next action:** Add schema + transition rules.

### P0-3 — Agent Presence + Capacity Engine
- **Owner:** Tony
- **Goal:** Show accurate live status and load per agent.
- **Scope in:** Heartbeat/presence updates, capacity points, overload flags.
- **Scope out:** External calendar integration.
- **Acceptance criteria:**
  - Agent status auto-downgrades stale presence.
  - Capacity meter = assigned active effort / max capacity.
  - Dashboard highlights overloaded agents.
- **Changed files/areas:** `backend/src/routes/agents*`, presence service, frontend agent cards.
- **Test steps:** Simulate presence timeout and assignment spikes; UI reflects state.
- **Blockers:** none.
- **Next action:** Add `agent_presence` + `agent_capacity` tables.

### P0-4 — Command Center UI v2 Shell
- **Owner:** Shuri
- **Goal:** Deliver top-level operator view with actionable sections.
- **Scope in:** New page layout, health strip, active incidents, execution bottlenecks.
- **Scope out:** Advanced theming.
- **Acceptance criteria:**
  - One-screen summary with filters by project/agent/state.
  - Click-through from KPI to underlying list.
  - Degraded mode fallback banner when realtime disconnected.
- **Changed files/areas:** `frontend/app/page.tsx` (split), `frontend/components/*` new modules.
- **Test steps:** Manual smoke across filters + navigation + no-data states.
- **Blockers:** P0-2 query endpoints.
- **Next action:** Build component skeleton with mocked contracts.

### P1-5 — Collaboration Threads + Decisions
- **Owner:** Peter + Shuri
- **Goal:** Convert chat feed into actionable team collaboration.
- **Scope in:** Threaded replies, decision tags, pinning, mention parsing.
- **Scope out:** File attachments.
- **Acceptance criteria:**
  - Message can create/attach to decision thread.
  - Decision has status (`open`, `decided`, `superseded`) and owner.
  - Search supports topic + decision filters.
- **Changed files/areas:** chat routes/services, new decisions schema, chat UI.
- **Test steps:** Create thread, mark decision, filter results, verify audit event.
- **Blockers:** none.
- **Next action:** DB schema + API contract.

### P1-6 — Audit Explorer + Export
- **Owner:** Vision
- **Goal:** Deliver reliable “who did what, when, why” explorer.
- **Scope in:** Advanced filter API + UI table + CSV export.
- **Scope out:** Long-term archive storage tiering.
- **Acceptance criteria:**
  - Filter by actor, entity, action, date range, project.
  - Export matches visible filter set.
  - Immutable audit rows (no updates/deletes).
- **Changed files/areas:** activity routes, audit query service, frontend audit views.
- **Test steps:** Create sample actions, validate filter counts and CSV rows.
- **Blockers:** P0-1 event contract.
- **Next action:** Add `audit_events` table and query indexes.

### P1-7 — Dependency Graph + Blocker Propagation
- **Owner:** Tony
- **Goal:** Surface upstream/downstream execution risk.
- **Scope in:** Work item dependencies, blocked-by chain, risk badge.
- **Scope out:** Auto-rescheduling engine.
- **Acceptance criteria:**
  - Can link dependencies between work items.
  - Blocked item shows causal chain in UI.
  - Dashboard risk count includes transitive blocks.
- **Changed files/areas:** execution schema/routes, board UI.
- **Test steps:** Create dependency chain; block root; verify propagation.
- **Blockers:** P0-2.
- **Next action:** Add `work_item_dependencies` table + query.

### P2-8 — SLA Alerts + Escalation Rules
- **Owner:** Vision
- **Goal:** Proactive alerts for deadline/SLA breach risk.
- **Scope in:** Rule engine job, alert events, command-center notifications.
- **Scope out:** SMS/phone integrations.
- **Acceptance criteria:**
  - Alerts fire at configured thresholds.
  - Alert ack/snooze recorded in audit trail.
  - False-positive rate acceptable in QA scenarios.
- **Changed files/areas:** worker scripts, alerts schema, frontend notifications.
- **Test steps:** Seed near-deadline items; verify alerts + ack flows.
- **Blockers:** P0-2 and P0-1.
- **Next action:** Implement scheduled evaluator.

### P2-9 — Query Performance Hardening
- **Owner:** Tony
- **Goal:** Keep command center fast as event volume grows.
- **Scope in:** materialized views, indexes, pagination, keyset query strategy.
- **Scope out:** Warehouse offload.
- **Acceptance criteria:**
  - p95 dashboard query <300ms on 100k events fixture.
  - No full table scans on critical endpoints.
  - Query plans documented.
- **Changed files/areas:** DB migrations/views, query services, perf scripts.
- **Test steps:** Run perf script and capture explain plans.
- **Blockers:** representative seed data.
- **Next action:** create benchmark dataset + profile baseline.

---

## 3) API + Data Model Upgrades Required

## New/updated APIs (v2)
- `GET /api/v2/command-center/summary`
- `GET /api/v2/agents/live`
- `POST /api/v2/work-items`
- `PATCH /api/v2/work-items/:id/transition`
- `POST /api/v2/work-items/:id/dependencies`
- `GET /api/v2/execution/board`
- `POST /api/v2/collab/messages`
- `POST /api/v2/collab/decisions`
- `GET /api/v2/audit/events`
- `GET /api/v2/audit/events/export`

## Core schema additions
1. `work_items`
   - replaces/extends `tasks` with: `type`, `state`, `priority`, `effort_points`, `sla_due_at`, `started_at`, `completed_at`, `owner_agent_id`.
2. `work_item_dependencies`
   - (`work_item_id`, `depends_on_work_item_id`, `dependency_type`).
3. `agent_presence`
   - latest heartbeat, status source, connection metadata.
4. `agent_capacity`
   - capacity baseline + effective available points.
5. `collab_threads`
   - thread metadata (`topic`, `status`, `owner_agent_id`).
6. `collab_messages`
   - thread-aware messages + mentions JSONB.
7. `decisions`
   - decision record linked to thread/project/work item.
8. `audit_events` (append-only)
   - immutable audit log, actor/entity/action/context snapshots.
9. `event_outbox`
   - guaranteed event publication queue.
10. `alerts`
   - escalations and acknowledgements.

## Compatibility strategy
- Keep existing `/api/v1/*` operational.
- Use adapter layer mapping `tasks` to `work_items` until v1 deprecation.
- Dual-write activity events into legacy + v2 audit tables during migration window.

---

## 4) Risk Register with Mitigations

1. **Risk:** Event/read-model drift causing inconsistent UI.
   - **Impact:** High
   - **Mitigation:** Transactional outbox, replay tests in CI, projection versioning.

2. **Risk:** Over-scoping v2 into a rewrite.
   - **Impact:** High
   - **Mitigation:** Weekly vertical slices; flag-gated rollout; strict scope-out per ticket.

3. **Risk:** Realtime instability (disconnects, duplicate events).
   - **Impact:** Medium
   - **Mitigation:** Idempotent event handlers, cursor-based resume, poll fallback.

4. **Risk:** Query latency spikes on audit/event heavy datasets.
   - **Impact:** High
   - **Mitigation:** materialized views + targeted indexes + perf gate before each release.

5. **Risk:** Ambiguous ownership model across agents/projects/work items.
   - **Impact:** Medium
   - **Mitigation:** single `owner_agent_id` invariant + explicit handoff event.

6. **Risk:** API contract churn blocks frontend.
   - **Impact:** Medium
   - **Mitigation:** OpenAPI/typed contract package and contract tests in CI.

7. **Risk:** Weak change traceability for sensitive ops.
   - **Impact:** High
   - **Mitigation:** append-only audit_events; actor attribution required on mutating calls.

8. **Risk:** Team throughput bottleneck due to cross-dependencies.
   - **Impact:** Medium
   - **Mitigation:** parallelize by slice (Tony infra, Peter backend features, Shuri UI, Vision QA gates) with dependency map enforced by Jarvis.

---

## Recommended delivery cadence (fast iterative)
- **Week 1:** P0-1, P0-2 (foundation and schema)
- **Week 2:** P0-3, P0-4 (live ops visibility + command center shell)
- **Week 3:** P1-5, P1-6 (collab + audit explorer)
- **Week 4:** P1-7 + P2-9 baseline (dependency risk + performance hardening)
- **Week 5:** P2-8 + stabilization/release gate

This plan upgrades Mission Control into a true operations cockpit without halting current delivery.