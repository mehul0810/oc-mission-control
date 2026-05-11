# MC-001 — Architecture & Technical Blueprint

## 1) System Architecture (MVP)

### Stack
- **Frontend:** Next.js (App Router) + Tailwind
- **Backend:** Next.js Route Handlers (`/api/*`) + service layer
- **DB:** PostgreSQL
- **Realtime:** WebSocket-compatible pub/sub (start with Supabase Realtime/Pusher abstraction)
- **Auth:** Admin-only session auth (single tenant, role = `admin`)

### Runtime Shape
- Browser UI calls `/api/v1/*`.
- API layer validates input, delegates to domain services, persists to Postgres.
- Domain events (task updates, chat messages, status changes) are written to `activity_events` and published to realtime channels.
- UI subscribes to realtime channels for dashboard counters, ownership board updates, and watercooler chat.

### Core Flows
1. **Directory/Portfolio load:** UI fetches summary endpoints (`agents`, `projects`, `tasks`) + counters.
2. **Task ownership updates:** API writes `tasks` + `task_assignments`, emits `task.updated` event.
3. **Chat send/receive:** API writes `chat_messages`, emits `chat.message.created`.

---

## 2) Module / Folder Structure

```txt
mission-control/
  apps/
    web/
      app/
        (dashboard)/
        api/
          v1/
            agents/
            projects/
            tasks/
            chat/
            activity/
      components/
        dashboard/
        ownership-board/
        chat/
      lib/
        api-client/
        auth/
        realtime/
  packages/
    domain/
      agents/
      projects/
      tasks/
      chat/
      activity/
    db/
      migrations/
      seeds/
      schema/
      client.ts
    shared/
      types/
      constants/
      utils/
  docs/
    ARCHITECTURE.md
```

### Ownership Boundaries
- `app/api/v1/*`: transport only (HTTP parsing, auth check, status codes).
- `packages/domain/*`: business rules/use-cases.
- `packages/db/*`: SQL/schema/migrations/repositories.
- `packages/shared/*`: cross-module contracts and utilities.

---

## 3) API Boundary & Conventions

### Versioning and Paths
- Prefix all endpoints with `/api/v1`.
- Noun-based resources, pluralized:
  - `GET /api/v1/agents`
  - `GET /api/v1/projects`
  - `GET /api/v1/tasks`
  - `POST /api/v1/tasks`
  - `PATCH /api/v1/tasks/:id`
  - `GET /api/v1/chat/messages`

### Naming
- JSON keys: `snake_case` in DB, `camelCase` in API responses.
- Event names: `domain.entity.action` (e.g., `task.assignment.updated`).
- Status enums (shared): `todo | in_progress | done | blocked`.

### Request/Response Rules
- Validate all input at API edge (zod or equivalent).
- Standard response envelope:
  - success: `{ data, meta? }`
  - error: `{ error: { code, message, details? } }`
- Use idempotent semantics:
  - `PUT/PATCH` safe to retry where practical.
  - Server-generated IDs (`uuid`).

### Realtime Channels
- `dashboard.metrics`
- `tasks.updates`
- `chat.messages`
- `activity.stream`

---

## 4) Top Risks + Mitigations

1. **Realtime complexity early in MVP**
   - *Risk:* delivery delays, race conditions, hard-to-debug state drift.
   - *Mitigation:* start with poll+refresh fallback; wrap realtime provider behind one adapter; keep event payloads minimal and versioned.

2. **Schema churn across sprint tickets**
   - *Risk:* blocking MC-002/003 as models evolve.
   - *Mitigation:* lock v1 schema for Sprint 1 core entities; additive migrations only during sprint; publish shared types from `packages/shared/types`.

3. **Ownership ambiguity (task vs assignment sources)**
   - *Risk:* inconsistent “who owns what now” board.
   - *Mitigation:* single source of truth = `task_assignments` active row per task; enforce one active owner constraint at DB level.

4. **API contract drift between UI and backend**
   - *Risk:* integration breakage and duplicate field assumptions.
   - *Mitigation:* API-first contract file (OpenAPI or typed DTOs) checked into repo; CI contract check on PR.

5. **Admin auth shortcuts becoming production debt**
   - *Risk:* insecure defaults carried forward.
   - *Mitigation:* isolate auth module now; gate all `/api/v1/*`; include explicit TODOs for RBAC and audit hardening in backlog.

---

## Implementation Readiness for Next Tickets
- **MC-002:** can implement schema/migrations and API handlers directly under `api/v1` + `packages/domain`.
- **MC-003:** can build dashboard and ownership board against stable `/api/v1` contracts and realtime channels.
- **MC-004:** can define smoke/regression suite around listed core flows + response envelope rules.
