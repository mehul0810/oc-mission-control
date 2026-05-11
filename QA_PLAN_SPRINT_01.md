# MC-004 — QA Plan Sprint 01 (Release Gate v0)

## Scope
This QA plan covers Sprint 1 deliverables:
- MC-001 Architecture blueprint
- MC-002 Backend foundation + schema v1
- MC-003 Dashboard shell + core visibility UI

Out of scope for Sprint 1 QA gate:
- Full Watercooler chat feature set
- Full performance/load testing
- Production hardening/security audit

## QA Objectives
- Validate end-to-end MVP foundation is functional locally.
- Catch blocker defects before sprint demo.
- Ensure reliable baseline for Sprint 2 feature expansion.

## Test Environments
- Local development environment (single machine)
- Fresh database instance for migration/seed validation
- Browser checks: latest Chrome + Safari

## Smoke Test Suite (Must Pass)
Run in this order on a clean setup:

1. **App startup smoke**
   - Frontend starts without fatal errors.
   - API starts and responds to health/base route.

2. **Database migration smoke**
   - Migration command executes cleanly from zero state.
   - Core tables exist: `agents`, `projects`, `tasks`, `task_assignments`.

3. **Seed data smoke**
   - Seed script runs successfully.
   - Dashboard-relevant demo records are present.

4. **Core API smoke**
   - Agent list/status endpoint returns expected schema and non-error status.
   - Project list endpoint returns expected schema.
   - Task list/counter endpoint returns expected status buckets.

5. **Dashboard UI smoke**
   - Dashboard shell loads.
   - Summary cards render (total agents, total projects, task counters).
   - Ownership board renders data rows.

6. **Filter smoke**
   - Filter by project works.
   - Filter by agent works.
   - Filter by status works.

7. **Basic resilience smoke**
   - Empty-state handling: UI shows safe empty states (no crash).
   - API invalid input returns graceful error response (4xx, not 5xx where avoidable).

## Regression Checklist (Sprint 1 Baseline)
Use this checklist for every pre-demo validation and any late sprint merge:

### Backend Regression
- [ ] Existing endpoints still return valid JSON and expected fields.
- [ ] No breaking changes to endpoint names/routes agreed in MC-001.
- [ ] Migration rerun behavior is documented and safe.
- [ ] Seed script remains idempotent or clearly reset-dependent.
- [ ] No new unhandled exceptions in server logs during standard flows.

### Data Regression
- [ ] Task counters match raw task data by status.
- [ ] Every active task has one owner in assignment data (where expected by seed).
- [ ] No orphaned foreign keys in core MVP entities.

### Frontend Regression
- [ ] Dashboard loads without console-breaking errors.
- [ ] Summary card values match API payload values.
- [ ] Ownership board columns and rows align with expected data model.
- [ ] Filter combinations do not break rendering.
- [ ] Loading and empty states remain readable and stable.

### UX/Functional Regression
- [ ] Time-to-visible dashboard remains acceptable for local demo flow.
- [ ] Core workflows require no manual DB edits during demo.
- [ ] No P0/P1 bug remains unresolved or unwaived.

## Defect Reporting Standard
Every bug must include:
- **Bug ID:** MC4-BUG-###
- **Title:** clear, outcome-focused
- **Area:** API / DB / UI / Integration
- **Environment:** commit hash + browser + local setup notes
- **Preconditions**
- **Steps to Reproduce**
- **Expected Result**
- **Actual Result**
- **Evidence:** logs, screenshots, response payloads
- **Severity** (model below)
- **Priority** (P0/P1/P2)
- **Owner**
- **Status:** Open / In Progress / Fixed / Verified / Deferred

## Severity Model
- **S1 — Critical**
  - System unusable, crash loop, data corruption, or core demo flow blocked.
  - No workaround.
  - Release gate: **hard stop**.

- **S2 — Major**
  - Core feature partially broken or incorrect business-critical data shown.
  - Workaround exists but is fragile/high-friction.
  - Release gate: fix required unless explicit waiver by Tech Lead + COO.

- **S3 — Moderate**
  - Non-core behavior broken, UI inconsistencies, recoverable errors.
  - Clear workaround exists.
  - Release gate: can defer with documented owner and due date.

- **S4 — Minor**
  - Cosmetic issues, microcopy, low-impact polish.
  - Release gate: safe to defer.

## Sprint 1 Demo Exit Criteria (QA Gate)
Sprint demo is QA-approved only if all are true:

1. Smoke suite pass rate = **100%**.
2. Regression checklist executed with no unresolved S1 defects.
3. No unresolved S2 defects without explicit written waiver.
4. Dashboard can demonstrate:
   - Total agents/projects/task counters
   - Ownership board visibility
   - Functional filters (project/agent/status)
5. Migration + seed flow reproducible on clean local setup.
6. QA evidence archived (checklist + bug log + test notes).

## Risk Notes for Sprint 1
- Data/UI mismatch risk is high while API contracts are still stabilizing.
- Late schema changes may invalidate seed assumptions.
- Filter logic regression likely during rapid UI iteration.

## Recommended QA Cadence (Within Sprint)
- **Daily quick smoke** after major merges.
- **Mid-sprint regression pass** to catch drift early.
- **Final full gate run** before Sprint 1 demo.

## Ownership
- QA Owner: **Vision**
- Technical sign-off partner: **Tony Stark**
- Final release gate decision: **Jarvis (COO)**
