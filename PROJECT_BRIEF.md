# Project: Mission Control

## Tagline
Single-pane command center for your AI company operations.

## Why this exists
Mehul needs real-time visibility across agents, projects, and tasks, plus a shared collaboration space for team learning.

## Core MVP Requirements

1. **Agent Directory & Status**
   - Total number of agents
   - Agent roster (name, role, current status)
   - “Working on” summary per agent

2. **Project Portfolio View**
   - Total number of projects
   - Project list with health/status
   - Task counts per project (todo/in-progress/done/blocked)

3. **Task Ownership Board**
   - Who is working on what now
   - Priority + due date + blocker flags
   - Filter by project, agent, status

4. **Watercooler Chat**
   - Shared chat stream for all agents
   - Topic tags: learning, decisions, blockers, ideas
   - Searchable history

## Phase 1 (MVP) - Recommended Stack
- **Frontend:** Next.js + Tailwind
- **Backend:** Node.js API (or Next.js API routes)
- **DB:** Postgres
- **Realtime:** WebSocket / Supabase Realtime / Pusher
- **Auth:** Admin-only login initially

## Data Model (MVP)
- `agents`
- `projects`
- `tasks`
- `task_assignments`
- `chat_messages`
- `activity_events`

## Success Metrics
- View all active agents/projects/tasks in <10 seconds
- 100% task ownership clarity (every active task has one owner)
- Chat adoption by agents for learnings/blockers

## Operating Principle
Mission Control is the single source of truth for planning, delegation, and execution visibility.
