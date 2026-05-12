# Mission Control v2 — Frontend Refactor Plan (Shuri)

## 1) Screen + Module Map (Command Center IA)

### A. `/` Command Center Home
- **Top Nav / Context Bar**: workspace switcher (future), global search, quick actions, user menu
- **Left Rail**: Dashboard, Work Board, Projects, Agents, Activity, Chat, Settings
- **Primary Region**: KPI strip + health pulse + “now/next/risk” panels
- **Secondary Region**: timeline feed + active blockers + SLA/overdue alerts

### B. `/work` Task Flow Workspace (Board/Table toggle)
- **View Toggle**: Kanban / Table / My Queue
- **Filter Dock**: project, owner, status, priority, due window, blocked-only
- **Main Content**:
  - Kanban lanes (todo/in-progress/blocked/done)
  - Dense table mode with sorting, column pinning, bulk actions
- **Detail Drawer**: task context, ownership history, blocker thread, activity

### C. `/projects` Portfolio
- Project cards + health score + progress bars
- Drill-in to project detail with tasks, owner map, milestone timeline

### D. `/agents` Agent Health
- Agent roster cards: status, active workload, blocked ratio, throughput trend
- Agent detail pane: current tasks, last activity, response/reliability indicators

### E. `/activity` Timeline + Audit
- Unified event stream with type chips, search, date range, actor filter
- “Critical events” mode (blockers, SLA misses, ownership flips)

### F. `/chat` Watercooler + Ops Channels
- Channel list, threaded message panel, composer with tags (learning/decision/blocker/idea)
- Context bridge: link task/project/agent into message

### G. Global UX Modules
- Command palette (⌘K)
- Toast + notifications center
- Empty/loading/error states library
- Keyboard navigation + accessibility shortcuts

---

## 2) Prioritized Frontend Tickets

### P0 — Foundation (must-do first)
1. **MC-FE-201 App Shell v2**
   - Persistent sidebar + top context bar + responsive frame
2. **MC-FE-202 Design Tokens + Theme System**
   - Colors, spacing, typography, elevation, status semantics
3. **MC-FE-203 Data Query Layer**
   - React Query/SWR adapters, normalized DTO mappers, cache keys
4. **MC-FE-204 State Patterns**
   - URL-synced filters, table/board prefs, panel state
5. **MC-FE-205 Reusable Data-State Wrappers**
   - skeleton/error/empty/retry patterns

### P1 — Core Command Center Experiences
6. **MC-FE-206 Command Center Home modules** (KPI, risk panel, now/next, alerts)
7. **MC-FE-207 Work Board (Kanban)** with drag interactions + blocked highlighting
8. **MC-FE-208 Work Table (high-density)** with sort/filter/column config
9. **MC-FE-209 Task Detail Drawer** with activity + ownership + quick edits
10. **MC-FE-210 Agent Health Dashboard** with workload and reliability metrics
11. **MC-FE-211 Activity Timeline UX** with filters + critical mode
12. **MC-FE-212 Chat UX refactor** (channelized view + linked context + search)

### P2 — Polish + Scale
13. **MC-FE-213 Responsive optimization** (tablet split panes, mobile bottom nav)
14. **MC-FE-214 Accessibility hardening** (focus order, ARIA, keyboard-only flows)
15. **MC-FE-215 Performance pass** (virtualized table/feed, memoization, suspense boundaries)
16. **MC-FE-216 Micro-interaction polish** (motion, optimistic updates, undo toasts)

---

## 3) Component Architecture (proposed)

```txt
frontend/
  app/
    (command-center)/
      layout.tsx
      page.tsx                  # home
      work/page.tsx
      projects/page.tsx
      agents/page.tsx
      activity/page.tsx
      chat/page.tsx
  components/
    shell/
      AppShell.tsx
      SidebarNav.tsx
      TopContextBar.tsx
      CommandPalette.tsx
    dashboard/
      KpiStrip.tsx
      HealthPulsePanel.tsx
      RiskAndBlockersPanel.tsx
      NowNextPanel.tsx
    work/
      WorkViewToggle.tsx
      WorkFilters.tsx
      WorkKanbanBoard.tsx
      WorkTable.tsx
      TaskDetailDrawer.tsx
    agents/
      AgentHealthGrid.tsx
      AgentDetailPanel.tsx
    activity/
      ActivityFeed.tsx
      ActivityFilters.tsx
    chat/
      ChannelList.tsx
      MessagePane.tsx
      Composer.tsx
      ContextLinkChip.tsx
    primitives/
      DataState.tsx
      StatusBadge.tsx
      MetricCard.tsx
      EmptyState.tsx
      ErrorState.tsx
  lib/
    api/
      client.ts
      queries.ts
      mappers.ts
    state/
      filters.store.ts
      ui.store.ts
    types/
      dashboard.ts
      work.ts
      chat.ts
```

### Architecture principles
- **Container/presentational split**: page-level containers fetch + map data; components remain UI-focused.
- **Stable view models**: isolate API drift via mapper layer.
- **Composable primitives**: one badge/card/table row style across all screens.
- **Realtime-safe updates**: optimistic mutation + background reconciliation.

---

## 4) UX Acceptance Criteria (MissionControlHQ-level polish)

### Command Center & IA
- Navigation exposes all core jobs within **1 click** from any screen.
- User can identify “what needs attention now” within **5 seconds**.
- KPI + risk panels never show contradictory counts (shared source of truth).

### Board/Table Task Flow Clarity
- Board and table share identical filter logic and counts.
- Any task can be located via filters/search in under **10 seconds**.
- Blocked tasks are visually distinct and carry blocker reason inline.

### Agent Health
- Agent cards show status + workload + recent activity without opening detail.
- Health indicators have explicit legend/tooltips (no ambiguous colors).

### Timeline / Activity
- Activity stream supports actor/type/time filters with URL persistence.
- Critical events mode surfaces blockers/SLA misses first.
- Clicking an event deep-links to related task/project/chat context.

### Chat UX
- Composer supports tagging and linking task/project context.
- Search returns relevant messages by keyword + tag + date range.
- New messages appear in near real-time without scroll jumps.

### Responsive Behavior
- Desktop: multi-panel productivity layout (sidebar + primary + secondary).
- Tablet: collapsible side rail + split content/drawer.
- Mobile: bottom nav + single-focus screens, no horizontal overflow.

### Accessibility + Performance
- Full keyboard navigation for nav, board rows, drawer actions, chat composer.
- WCAG AA contrast for text/status chips.
- Initial interactive load <2.5s on standard dev dataset; heavy lists are virtualized.

---

## 5) Suggested Execution Sequence (2-week refactor wave)
1. P0 shell/tokens/query layer/state wrappers
2. Work module (board + table + drawer)
3. Command center home + agent health + activity
4. Chat refactor + responsive/a11y/perf hardening
5. QA pass with acceptance criteria sign-off

This plan keeps current MVP functional while progressively replacing page-by-page with a cohesive v2 command center UX.