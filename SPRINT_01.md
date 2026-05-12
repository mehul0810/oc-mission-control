# Mission Control — Sprint 1 (Execution Start)

## Sprint Goal
Stand up the foundation for agent/project/task visibility with a working skeleton UI + API + DB schema.

## Timeline
- Duration: 5 working days
- Status: Completed

## Tickets

### MC-001 — Architecture & Technical Blueprint
- **Owner:** Tony Stark (Tech Lead)
- **Priority:** P0
- **Deliverables:**
  - System architecture (frontend/backend/realtime/db)
  - Folder/module structure
  - API boundary and naming conventions
  - Risk register + mitigation
- **Acceptance Criteria:**
  - Architecture doc committed
  - Clear implementation path for MC-002/003/004

### MC-002 — Backend Foundation + Schema v1
- **Owner:** Peter Parker (Senior WP Plugin Dev)
- **Priority:** P0
- **Deliverables:**
  - API scaffold for agents/projects/tasks
  - DB schema migrations for core entities
  - Seed data for demo dashboard
- **Acceptance Criteria:**
  - Endpoints run locally
  - Migrations apply cleanly
  - Seed script produces usable demo data

### MC-003 — Dashboard Shell + Core Visibility UI
- **Owner:** Shuri (Senior WP Block Theme Dev)
- **Priority:** P0
- **Deliverables:**
  - Mission Control dashboard shell
  - Cards: total agents, total projects, task counters
  - Ownership board table (who works on what)
- **Acceptance Criteria:**
  - UI loads from mocked or live API data
  - Filters by project/agent/status present

### MC-004 — QA Strategy + Release Gate v0
- **Owner:** Vision (QA Engineer)
- **Priority:** P0
- **Deliverables:**
  - Sprint QA plan
  - Smoke + regression checklist
  - Bug report template and severity model
- **Acceptance Criteria:**
  - QA doc committed
  - Exit criteria defined for Sprint 1 demo

## COO Rules (Jarvis)
- Every ticket must include: changed files, test steps, blocker note, next action.
- No ticket closes without acceptance criteria evidence.
- All work committed to GitHub with clean, scoped commits.
