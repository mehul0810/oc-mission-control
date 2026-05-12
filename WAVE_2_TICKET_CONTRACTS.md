# Mission Control v2 — Wave 2 Ticket Contracts

Wave 2 objective: ship collaboration + decisions + dependency-risk + audit explorer on top of Wave 1 contracts.

---

## MC2-W2-001 — Collaboration Threads + Message API
- **Owner:** Peter
- **Goal:** Deliver thread-aware collaboration API with mention support and outbox events.
- **Scope In:** `collab_threads`, `collab_messages`, `POST /api/v2/collab/messages`, mention validation, SSE `chat` events.
- **Scope Out:** file attachments, reactions, rich-text editor features.
- **Acceptance Criteria:**
  1. Messages persist with valid `threadId` and actor attribution.
  2. Mention parsing validates known agent IDs and rejects unknown IDs.
  3. Successful writes emit `collab.message.created` outbox events.
  4. Read model feed is queryable by thread/project with cursor pagination.
- **Changed files/areas:** backend migrations, `backend/src/routes/collab*`, collab services, projections.
- **Test Steps:** create thread -> post message with mention -> verify DB row + SSE event + feed query.
- **Blockers:** Wave 1 outbox/event envelope must already be merged.
- **Next Action:** implement schema + route contracts and open for Tony review.

## MC2-W2-002 — Decision Lifecycle + Transition Enforcement
- **Owner:** Tony
- **Goal:** Implement strict decision state machine and audit-safe transitions.
- **Scope In:** `decisions` table, create endpoint, transition endpoint, transition guard logic, decision-related events.
- **Scope Out:** AI-generated decision summaries.
- **Acceptance Criteria:**
  1. Allowed transitions follow lock: `open->decided|superseded`, `decided->superseded`.
  2. `decided` requires `resolution` + `decidedByAgentId`.
  3. Invalid transitions return `409 INVALID_DECISION_TRANSITION`.
  4. Every transition emits event + immutable audit row.
- **Changed files/areas:** decision routes/services, validation schemas, audit integration.
- **Test Steps:** create decision -> attempt valid/invalid transitions -> verify codes and event/audit rows.
- **Blockers:** MC2-W2-001 thread model availability.
- **Next Action:** commit transition guard contract tests first.

## MC2-W2-003 — Dependency Graph + Cycle Detection
- **Owner:** Peter
- **Goal:** Add dependency edges with cycle prevention and blocker propagation queries.
- **Scope In:** `work_item_dependencies`, `POST /api/v2/work-items/:id/dependencies`, `GET /api/v2/execution/dependencies/:id`, propagation read model.
- **Scope Out:** auto-reschedule optimization.
- **Acceptance Criteria:**
  1. Self-dependency and cyclic insertions are rejected with `409 DEPENDENCY_CYCLE`.
  2. Dependency query returns upstream/downstream slices and `blocked` computation.
  3. `done` transition rejects unresolved hard dependencies.
  4. Risk counters update in command center projection.
- **Changed files/areas:** execution routes/services, graph helper, projection jobs, board query mapping.
- **Test Steps:** create 3-item chain -> block root -> verify propagation and transition guard behavior.
- **Blockers:** Wave 1 work-item transition API must be stable.
- **Next Action:** ship migration and cycle-detection service with benchmark test.

## MC2-W2-004 — Audit Explorer API + CSV Export
- **Owner:** Vision
- **Goal:** Provide trustworthy audit filtering and export contract.
- **Scope In:** `GET /api/v2/audit/events`, keyset pagination, CSV export endpoint, immutable audit checks.
- **Scope Out:** long-term archive tiering.
- **Acceptance Criteria:**
  1. Filters by actor/entity/action/project/date are combinable and deterministic.
  2. Export output matches current filter result set exactly.
  3. Audit rows are insert-only at API and DB layers.
  4. Endpoint meets p95 <= 500ms on seeded fixture.
- **Changed files/areas:** audit query service, export serializer, indexes, QA perf script.
- **Test Steps:** seed actions -> query filtered result -> export CSV -> compare row parity/count.
- **Blockers:** MC2-W2-001/002 event emission to populate audit dataset.
- **Next Action:** define canonical CSV header contract and lock snapshot test.

## MC2-W2-005 — Frontend Wave 2 Integration (Collab + Dependency + Audit)
- **Owner:** Shuri
- **Goal:** Integrate Wave 2 APIs into production UI with fallback-safe behavior.
- **Scope In:** collaboration panel, decision status controls, dependency graph panel, audit explorer table/export controls.
- **Scope Out:** full visual redesign and theme overhauls.
- **Acceptance Criteria:**
  1. UI consumes only locked `/api/v2/*` Wave 2 contracts.
  2. Decision transition forms enforce required fields before submit.
  3. Dependency panel renders blocked-by/downstream chain with empty/error states.
  4. Audit filters + export are URL-state synchronized and resilient to SSE disconnect.
- **Changed files/areas:** frontend app routes/components, API clients, DTO mappers.
- **Test Steps:** manual smoke across supported views; force API error/disconnect and verify graceful recovery.
- **Blockers:** MC2-W2-001 through MC2-W2-004 endpoint readiness.
- **Next Action:** scaffold typed DTOs and mock adapters while backend finalizes.

## MC2-W2-006 — Wave 2 QA Gate + Rollout Readiness
- **Owner:** Vision
- **Goal:** Certify Wave 2 as shippable with evidence-backed quality gates.
- **Scope In:** API contract tests, transition negative tests, export parity checks, perf captures, rollout checklist.
- **Scope Out:** full load test and chaos engineering suite.
- **Acceptance Criteria:**
  1. All Wave 2 acceptance criteria mapped to executed evidence artifacts.
  2. No open Sev-1/Sev-2 defects at release candidate cut.
  3. Perf thresholds from architecture lock are met or waived with explicit approval.
  4. Rollout and rollback rehearsed in staging with documented timings.
- **Changed files/areas:** `QA_CHECKLIST.md`, `QA_RELEASE_STRATEGY_V2.md`, evidence docs/scripts.
- **Test Steps:** run end-to-end Wave 2 gate; publish go/no-go signed by Vision + Tony.
- **Blockers:** MC2-W2-001..005 merged to release branch.
- **Next Action:** prep evidence matrix and dry-run scripts before code freeze.

---

## Wave 2 Dependency Order (execution plan)
1. **MC2-W2-001** (collab foundation)
2. **MC2-W2-002** (decision lifecycle)
3. **MC2-W2-003** (dependency graph)
4. **MC2-W2-004** (audit explorer API/export)
5. **MC2-W2-005** (frontend integration; starts on mocks in parallel after 001)
6. **MC2-W2-006** (QA gate and rollout sign-off)

Parallelization notes:
- Shuri can begin UI against mocks after contract lock from 001/002.
- Vision can prepare perf/export harness before final backend merge.

## Wave 2 Risk Register + Mitigations
1. **Contract drift across FE/BE** (Impact: High)
   - Mitigation: typed DTO package + contract snapshot tests in CI.
2. **Dependency graph cycle bug under concurrent writes** (Impact: High)
   - Mitigation: DB constraint + transactional cycle check + race-condition test.
3. **Audit export mismatch vs filtered table** (Impact: Medium)
   - Mitigation: shared query builder for view and export paths.
4. **Realtime disconnect causing stale collaboration UI** (Impact: Medium)
   - Mitigation: SSE resume with `Last-Event-ID` + poll fallback banner.
5. **Projection lag under burst writes** (Impact: Medium)
   - Mitigation: outbox relay backpressure controls + lag metrics alerts.

## Wave 2 Release Risk Note
- **Current risk:** Medium
- **Primary drivers:** dependency cycle correctness, export parity, projection lag
- **Mitigation owners:** Tony (architecture/guards), Peter (graph impl), Vision (QA gates), Shuri (UI fallback behavior)