# MC-003 — Frontend Dashboard Plan

## Objective
Ship a functional Mission Control dashboard shell with high-signal visibility widgets and an ownership board, wired to mocked/live API data.

## Page Layout (Single Dashboard Route)
1. **Header Bar**
   - Title: Mission Control
   - Last-updated timestamp
   - Global filter row (Project, Agent, Status)
2. **KPI Card Grid (Top)**
   - Total Agents
   - Total Projects
   - Task Counters (Todo / In Progress / Done / Blocked)
3. **Ownership Board (Main Content)**
   - Table showing who is working on what
4. **Empty/Error/Loading States**
   - Skeletons during fetch
   - Empty state copy when no matches
   - Inline error with retry

## Key Components
- `DashboardShell`
- `DashboardHeader`
- `GlobalFilters`
- `KpiCards`
  - `TotalAgentsCard`
  - `TotalProjectsCard`
  - `TaskCountersCard`
- `OwnershipBoardTable`
  - Columns: Task, Project, Agent, Status, Priority, Due Date, Blocker
- `DataStateWrapper` (loading/error/empty)

## Data Dependencies
Minimum payloads required (via mock or API):
- **Agents**: `id, name, role, status`
- **Projects**: `id, name, health, status`
- **Tasks**: `id, title, project_id, status, priority, due_date, is_blocked`
- **Task Assignments**: `task_id, agent_id`

Derived frontend metrics:
- `totalAgents = agents.length`
- `totalProjects = projects.length`
- Task counters grouped by `tasks.status`
- Ownership rows = `tasks + task_assignments + agents + projects` join in view-model layer

## Filtering Behavior (Project / Agent / Status)
- Filters are global and apply to:
  - Ownership board rows
  - Task counters (recomputed from filtered task set)
- **Project filter**: matches `task.project_id`
- **Agent filter**: matches `assignment.agent_id`
- **Status filter**: matches `task.status`
- Multi-filter logic: **AND** across selected filters
- Default: all filters = `All`
- Empty result: show “No tasks match current filters”
- URL persistence (recommended): query params `?project=&agent=&status=`

## Delivery Sequence
1. Build static shell + responsive layout
2. Implement mock data adapter + component contracts
3. Wire KPI cards and board table to view-model transforms
4. Add global filters + AND filter logic
5. Add loading/error/empty states
6. Swap mock adapter with MC-002 endpoints (no UI contract change)

## Acceptance Check (MC-003)
- Dashboard shell renders end-to-end
- KPI cards display valid counts
- Ownership board shows mapped task ownership
- Filters for project/agent/status work and update table + counters
- Works with mock data and can switch to live API data
