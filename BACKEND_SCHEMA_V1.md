# MC-002 — Backend Foundation + Schema v1

## Scope
Build-ready backend baseline for Mission Control MVP with:
- API scaffold for `agents`, `projects`, `tasks`
- Postgres schema + migrations for core entities
- Seed data for local demo dashboard

---

## 1) API Scaffold Plan

## Runtime/Structure (recommended)
- Node.js + TypeScript
- Express (or Next.js route handlers if monorepo prefers)
- Postgres via Prisma ORM (recommended) or Knex
- Validation: Zod
- Logging: pino
- Tests: Vitest + supertest

## Suggested module layout
```txt
src/
  app.ts
  server.ts
  config/
  db/
    client.ts
  modules/
    agents/
      agents.routes.ts
      agents.controller.ts
      agents.service.ts
      agents.schema.ts
    projects/
      projects.routes.ts
      projects.controller.ts
      projects.service.ts
      projects.schema.ts
    tasks/
      tasks.routes.ts
      tasks.controller.ts
      tasks.service.ts
      tasks.schema.ts
  middleware/
    error-handler.ts
    not-found.ts
```

## API conventions
- Base path: `/api/v1`
- JSON only
- Timestamps in ISO 8601 UTC
- Pagination: `?page=1&limit=20`
- Standard response envelope:
```json
{
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 0 }
}
```
- Error envelope:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": []
  }
}
```

---

## 2) Endpoint List (v1)

## Health
- `GET /api/v1/health` — service/db health check

## Agents
- `GET /api/v1/agents` — list agents (filters: `status`, `role`)
- `POST /api/v1/agents` — create agent
- `GET /api/v1/agents/:id` — agent detail
- `PATCH /api/v1/agents/:id` — update profile/status
- `DELETE /api/v1/agents/:id` — soft delete (set inactive)

## Projects
- `GET /api/v1/projects` — list projects (filters: `status`, `health`)
- `POST /api/v1/projects` — create project
- `GET /api/v1/projects/:id` — project detail + counters
- `PATCH /api/v1/projects/:id` — update project
- `DELETE /api/v1/projects/:id` — archive project

## Tasks
- `GET /api/v1/tasks` — list tasks (filters: `projectId`, `assigneeId`, `status`, `priority`)
- `POST /api/v1/tasks` — create task
- `GET /api/v1/tasks/:id` — task detail
- `PATCH /api/v1/tasks/:id` — update task/status/blocker
- `DELETE /api/v1/tasks/:id` — soft delete

## Dashboard helper endpoints (needed by MC-003)
- `GET /api/v1/dashboard/summary`
  - totals: agents, projects
  - task counters: todo/in_progress/done/blocked
- `GET /api/v1/dashboard/ownership-board`
  - flattened view: task + assignee + project + status + priority + due date + blocker

---

## 3) DB Schema (Postgres v1)

## Enums
- `agent_status`: `active`, `idle`, `offline`
- `project_status`: `planning`, `active`, `on_hold`, `completed`, `archived`
- `project_health`: `green`, `yellow`, `red`
- `task_status`: `todo`, `in_progress`, `done`, `blocked`
- `task_priority`: `low`, `medium`, `high`, `critical`

## Table: `agents`
- `id` UUID PK
- `name` VARCHAR(120) NOT NULL
- `role` VARCHAR(120) NOT NULL
- `email` VARCHAR(255) UNIQUE NULL
- `status` agent_status NOT NULL DEFAULT `active`
- `working_on_summary` TEXT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

Indexes:
- `idx_agents_status(status)`
- `idx_agents_is_active(is_active)`

## Table: `projects`
- `id` UUID PK
- `name` VARCHAR(160) NOT NULL UNIQUE
- `slug` VARCHAR(180) NOT NULL UNIQUE
- `description` TEXT NULL
- `status` project_status NOT NULL DEFAULT `planning`
- `health` project_health NOT NULL DEFAULT `green`
- `owner_agent_id` UUID NULL FK -> `agents(id)` ON DELETE SET NULL
- `start_date` DATE NULL
- `due_date` DATE NULL
- `is_archived` BOOLEAN NOT NULL DEFAULT FALSE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

Indexes:
- `idx_projects_status(status)`
- `idx_projects_health(health)`
- `idx_projects_owner_agent_id(owner_agent_id)`

## Table: `tasks`
- `id` UUID PK
- `project_id` UUID NOT NULL FK -> `projects(id)` ON DELETE CASCADE
- `title` VARCHAR(220) NOT NULL
- `description` TEXT NULL
- `status` task_status NOT NULL DEFAULT `todo`
- `priority` task_priority NOT NULL DEFAULT `medium`
- `assignee_agent_id` UUID NULL FK -> `agents(id)` ON DELETE SET NULL
- `is_blocked` BOOLEAN NOT NULL DEFAULT FALSE
- `blocker_note` TEXT NULL
- `due_date` DATE NULL
- `position` INT NOT NULL DEFAULT 0
- `created_by_agent_id` UUID NULL FK -> `agents(id)` ON DELETE SET NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `deleted_at` TIMESTAMPTZ NULL (soft delete)

Indexes:
- `idx_tasks_project_id(project_id)`
- `idx_tasks_assignee_agent_id(assignee_agent_id)`
- `idx_tasks_status(status)`
- `idx_tasks_priority(priority)`
- `idx_tasks_project_status(project_id, status)`
- Partial index for active tasks:
  - `idx_tasks_not_deleted(deleted_at)` where `deleted_at IS NULL`

## Table: `task_assignments` (optional in v1, future-proof)
Use this only if multi-assignee becomes required.
- `id` UUID PK
- `task_id` UUID NOT NULL FK -> `tasks(id)` ON DELETE CASCADE
- `agent_id` UUID NOT NULL FK -> `agents(id)` ON DELETE CASCADE
- `assignment_role` VARCHAR(80) NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- Unique: `(task_id, agent_id)`

---

## 4) Migration Plan

Order:
1. Create extensions (`pgcrypto` if using `gen_random_uuid()`)
2. Create enums
3. Create `agents`
4. Create `projects`
5. Create `tasks`
6. Create optional `task_assignments`
7. Add indexes
8. Add trigger/function for `updated_at` auto-refresh on update

Validation checks after migrate:
- All tables exist
- FK constraints valid
- Indexes created
- Rollback works on local

---

## 5) Seed Data Plan (Demo Dashboard Ready)

Target seed:
- Agents: 6
  - Tony Stark, Peter Parker, Shuri, Vision, Jarvis, Mehul
- Projects: 3
  - Mission Control, OneCaptcha, ThemeRouter
- Tasks: 18 (6 per project)
  - Mix of `todo`, `in_progress`, `done`, `blocked`
  - At least 1 blocked task per active project
  - Every active task has an assignee

Seed script behavior:
- Idempotent with upsert by unique keys (`slug`, `email`, stable task seed ids)
- Safe to rerun locally
- Produces consistent dashboard counts for MC-003

---

## 6) Local Done Criteria (MC-002 acceptance mapping)

- Endpoints run locally
  - `GET /api/v1/health` returns DB connected
  - CRUD endpoints respond with validation + errors correctly
- Migrations apply cleanly
  - Fresh DB migrate succeeds with no manual steps
- Seed script produces usable demo data
  - Dashboard endpoints return non-empty totals, counters, and ownership rows

---

## 7) Immediate Implementation Sequence

1. Bootstrap server + DB client + health route
2. Implement migrations/enums/tables
3. Add seeds and verify dashboard data
4. Implement agents routes/service
5. Implement projects routes/service
6. Implement tasks routes/service
7. Implement summary + ownership-board queries
8. Add API smoke tests and finalize

This is intentionally scoped to unblock MC-003 UI work immediately.