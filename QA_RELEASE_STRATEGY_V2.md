# Mission Control v2 — QA & Release Strategy (Vision)

## 1) QA Mission
Ship Mission Control v2 with predictable quality by enforcing:
- risk-based test matrix,
- API + UI smoke coverage,
- regression suites,
- performance sanity checks,
- hard release gates,
- consistent bug severity/priority handling.

## 2) Scope Classification
- **Project:** oc-mission-control
- **Goal:** QA/release readiness for v2
- **Type:** QA + Release
- **Owner:** Vision (QA)
- **Sign-off Partners:** Tony (technical risk), Jarvis (go/no-go)
- **Risk Level:** Medium (realtime updates + integrated dashboard flows)

---

## 3) Test Matrix (v2)

| Area | Coverage Type | Critical Scenarios | Pass Criteria |
|---|---|---|---|
| API Core (`agents/projects/tasks`) | Smoke + regression | list/create/update/read consistency, envelope errors, auth on write | 100% smoke pass; no contract-breaking fields |
| Dashboard Summary | UI smoke + integration | summary cards match API values | UI counters equal API response in same run |
| Ownership Board | UI smoke + regression | row render, empty states, status/priority/due/blocker visibility | no crash; row schema intact; fallback values shown |
| Task Create flow | Integration + negative | create task via UI, unauthorized write blocked, invalid payload rejected | success path works; 401/403 + 4xx for invalid input |
| Chat + Activity | Integration + realtime smoke | post chat, activity timeline update, SSE stream reconnect behavior | new message appears; activity entry created; no fatal UI error |
| Activity/Event stream | API + resilience | `/events/stream` connects, emits on chat/activity updates | event received within 3s on local env |
| Error handling | Regression | 404 envelope, 500 envelope safety, failed fetch UI notice | consistent `{ error: { code, message } }` |
| Cross-browser sanity | Manual smoke | latest Chrome + Safari render and interact | no blocker UX defects |
| Performance sanity | Non-functional | dashboard first meaningful render + API response p95 local | render <=2.5s, API p95 <=400ms local smoke data |

---

## 4) Regression Suites

## Suite A — API Contract Regression (must-run every PR touching backend)
- Health: `GET /api/v1/health`
- Core lists: `GET /api/v1/agents`, `GET /api/v1/projects`, `GET /api/v1/tasks`
- Dashboard: `GET /api/v1/dashboard/summary`, `GET /api/v1/dashboard/ownership-board`
- Chat/activity: `GET /api/v1/chat/messages`, `GET /api/v1/activity`
- Error envelopes:
  - unknown route -> `404` with error envelope
  - invalid write payload -> `4xx` with error envelope
- Auth checks:
  - mutating routes reject without valid `x-admin-key`

## Suite B — UI Regression (must-run every PR touching frontend)
- App loads without runtime crash.
- KPI cards render and are non-negative integers.
- Ownership board renders stable rows and placeholders (`—`) where data missing.
- Quick add task sends request and refreshes list.
- Watercooler post appends message and reflects in timeline.
- API failure shows user-safe error notice.

## Suite C — End-to-End Smoke (pre-release mandatory)
- Backend build + start
- Frontend start
- Full dashboard load against live backend
- Create task -> verify in board + counters
- Post chat -> verify in chat + activity
- Verify event stream updates without full page reload

---

## 5) Performance Sanity Checks (release-candidate gate)

Measure on clean local environment with seeded dataset:
1. `GET /api/v1/dashboard/summary` p95 latency <= **400ms** over 30 requests.
2. `GET /api/v1/dashboard/ownership-board` p95 latency <= **600ms** over 30 requests.
3. Dashboard initial visible content <= **2.5s** (manual stopwatch + browser perf panel).
4. No memory leak symptom during 10-min idle with SSE open (no steady linear memory climb >20%).

If any threshold fails: release blocked unless explicit waiver from Tony + Jarvis.

---

## 6) Release Gates (v2)

## Gate 0 — Build Integrity
- `bash scripts/verify.sh` passes
- backend build passes
- frontend build/dev startup passes

## Gate 1 — Smoke Integrity
- `bash scripts/smoke_api.sh` passes
- UI smoke checklist complete (Chrome + Safari)

## Gate 2 — Regression Integrity
- Suite A + B executed
- no unresolved Sev-1
- no unresolved Sev-2 without written waiver

## Gate 3 — Performance Sanity
- All four performance checks meet thresholds

## Gate 4 — Release Readiness Evidence
- Known limitations documented
- Bug log updated with repro + owner + ETA
- Final QA sign-off note includes risk level: none/low/med/high

**Go/No-Go Rule:** all gates pass OR approved waiver recorded for each failed non-critical gate.

---

## 7) Bug Severity + Priority Rubric

| Severity | Definition | Default Priority | Release Impact |
|---|---|---|---|
| **Sev-1 Critical** | Crash, data corruption, core flow unusable, security/auth bypass | P0 | Hard stop |
| **Sev-2 Major** | Core feature incorrect/unstable, high-friction workaround only | P1 | Block unless waiver |
| **Sev-3 Moderate** | Non-core functional issue, clear workaround exists | P2 | Can defer with owner/date |
| **Sev-4 Minor** | Cosmetic/copy/polish issue | P3 | Defer allowed |

**Priority SLA Targets**
- P0: fix/mitigate same day
- P1: fix before release cut
- P2: schedule next sprint
- P3: backlog grooming

---

## 8) Ticketized QA Plan (contract-complete)

## MC2-QA-101 — API Smoke & Contract Harness
- **Goal:** Ensure all core `/api/v1/*` endpoints and envelopes are stable.
- **Scope In:** health, agents/projects/tasks, dashboard, chat/activity, auth-negative checks.
- **Scope Out:** load/stress and security pen-test.
- **Acceptance Criteria:**
  1. Smoke script passes on clean run.
  2. Error envelope checks added for 404 + invalid payload.
  3. Auth-negative checks for write routes recorded.
  4. Evidence log includes command output + timestamp.
- **Changed files/areas:** `scripts/smoke_api.sh`, `QA_CHECKLIST.md`, backend route validation touchpoints.
- **Test steps:** run verify -> run smoke -> run negative curl cases -> archive output.
- **Blockers:** missing validation on mutating endpoints may return 500 instead of 4xx.
- **Next action:** Peter + Vision pair to close validation gaps.

## MC2-QA-102 — UI Smoke & Realtime Verification
- **Goal:** Validate dashboard core UX and realtime update behavior.
- **Scope In:** KPI cards, ownership board, quick add task, chat post, activity timeline, SSE update.
- **Scope Out:** full accessibility audit and visual regression tooling.
- **Acceptance Criteria:**
  1. UI smoke checklist completed on Chrome + Safari.
  2. Task create and chat post reflect without manual reload.
  3. Failed API request surfaces user-safe error notice.
  4. QA artifacts include screenshots for each major panel.
- **Changed files/areas:** `frontend/app/page.tsx`, QA checklist artifacts.
- **Test steps:** start backend/frontend -> exercise UI flows -> disconnect/reconnect backend once -> verify graceful recovery.
- **Blockers:** SSE reconnect behavior may be flaky under backend restart.
- **Next action:** Shuri + Peter harden SSE reconnection and expose status indicator.

## MC2-QA-103 — Regression Suite Packaging
- **Goal:** Standardize repeatable regression suites for PR and release usage.
- **Scope In:** Suite A/B/C definitions, run order, evidence template, pass/fail policy.
- **Scope Out:** CI pipeline automation (separate DevOps ticket).
- **Acceptance Criteria:**
  1. Regression suites documented with exact commands + owners.
  2. Pre-release runbook includes stop conditions.
  3. Bug template linked with severity/priority rubric.
- **Changed files/areas:** `QA_PLAN_SPRINT_01.md` (or new v2 QA runbook), `QA_CHECKLIST.md`.
- **Test steps:** dry-run checklist with one engineer not involved in authoring.
- **Blockers:** none.
- **Next action:** Vision publishes runbook, Tony reviews for technical completeness.

## MC2-QA-104 — Performance Sanity Gate
- **Goal:** Catch obvious performance regressions before release.
- **Scope In:** API latency sanity, dashboard render time, SSE idle stability check.
- **Scope Out:** production-scale benchmarking.
- **Acceptance Criteria:**
  1. Latency measurements captured for summary/ownership endpoints (30 samples each).
  2. Dashboard first visible content <=2.5s on local seeded env.
  3. 10-min SSE idle session shows no significant memory leak trend.
  4. Results attached in QA sign-off.
- **Changed files/areas:** performance test notes and evidence docs.
- **Test steps:** scripted curl timings + browser perf session + memory snapshot comparison.
- **Blockers:** no baseline tooling; manual measurement required initially.
- **Next action:** Tony to advise lightweight benchmark script adoption in next sprint.

## MC2-QA-105 — Release Gate Execution & Sign-Off
- **Goal:** Enforce go/no-go with evidence-backed quality gates.
- **Scope In:** Gate 0-4 execution, bug triage review, waiver tracking.
- **Scope Out:** deployment rollout strategy.
- **Acceptance Criteria:**
  1. All release gates marked pass/fail with evidence links.
  2. Open defects triaged with severity, priority, owner, ETA.
  3. Final QA recommendation issued: Go / Go-with-waiver / No-Go.
- **Changed files/areas:** release checklist, sign-off note.
- **Test steps:** execute gate sequence; hold 30-min triage; publish decision note.
- **Blockers:** unresolved Sev-1/Sev-2 without waiver.
- **Next action:** Jarvis convenes final gate review with Tony + Vision.

---

## 9) Measurable Done Definition (QA Complete)
QA for Mission Control v2 is **Done** only when:
1. Gate 0-4 completed with archived evidence.
2. Smoke pass rate = **100%**.
3. Regression suites A and B executed on release candidate commit.
4. No open Sev-1 defects.
5. Any open Sev-2 has explicit written waiver (owner + expiry date).
6. Performance sanity thresholds all pass, or waived with rationale.
7. Final sign-off published by Vision and acknowledged by Tony + Jarvis.

If any item above is missing, status = **Not Done**.
