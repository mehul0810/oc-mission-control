"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Summary = {
  totals: { agents: number; projects: number; tasks?: number };
  tasks: { todo: number; in_progress: number; done: number; blocked: number };
  workload?: { overloadedAgents?: number };
};

type Agent = { id: string; name: string; role: string; status: string };
type Project = { id: string; name: string; status: string; ownerAgentId: string };
type Task = {
  id: string;
  title: string;
  projectId: string;
  agentId: string;
  status: "todo" | "in_progress" | "done" | "blocked" | string;
  priority: string;
  dueDate?: string | null;
  blocker?: string | null;
};
type ChatMessage = { id: string; topic: string; authorAgentId: string; content: string; createdAt: string };
type Activity = { id: string; type: string; action: string; summary: string; createdAt: string };

type OwnershipRow = {
  taskId?: string;
  title?: string;
  projectName?: string;
  agentName?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  blocker?: string | null;
};

type WorkItemRow = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  ownerAgentId: string;
  agentName: string;
  state: string;
  priority: string;
  dueDate?: string | null;
  blocker?: string | null;
};

type FilterState = {
  projectId: string;
  agentId: string;
  state: string;
  priority: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "mission-control-admin";
const DEFAULT_SUMMARY: Summary = {
  totals: { agents: 0, projects: 0, tasks: 0 },
  tasks: { todo: 0, in_progress: 0, done: 0, blocked: 0 }
};

const navItems = ["Dashboard", "Work Board", "Projects", "Agents", "Activity", "Chat", "Settings"];
const boardColumns = ["todo", "in_progress", "blocked", "done"];

async function fetchFromCandidates<T>(candidates: string[]): Promise<T | null> {
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      // try next endpoint
    }
  }
  return null;
}

function queryFromFilters(filters: FilterState): string {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set("projectId", filters.projectId);
  if (filters.agentId) qs.set("agentId", filters.agentId);
  if (filters.state) qs.set("status", filters.state);
  if (filters.priority) qs.set("priority", filters.priority);
  const value = qs.toString();
  return value ? `?${value}` : "";
}

function toWorkItems(rows: OwnershipRow[]): WorkItemRow[] {
  return rows.map((row, index) => ({
    id: row.taskId || `row-${index}`,
    title: row.title || "—",
    projectId: "",
    projectName: row.projectName || "—",
    ownerAgentId: "",
    agentName: row.agentName || "—",
    state: row.status || "todo",
    priority: row.priority || "medium",
    dueDate: row.dueDate,
    blocker: row.blocker
  }));
}

function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate).getTime();
  return Number.isFinite(due) && due < Date.now();
}

export default function Page() {
  const [summary, setSummary] = useState<Summary>(DEFAULT_SUMMARY);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [degradedRealtime, setDegradedRealtime] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ projectId: "", agentId: "", state: "", priority: "" });
  const [boardView, setBoardView] = useState<"board" | "table">("board");

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const query = queryFromFilters(filters);

      const [summaryJson, boardJson, agentsJson, projectsJson, tasksJson, chatJson, activityJson] = await Promise.all([
        fetchFromCandidates<{ data?: Summary }>([
          `${API_BASE_URL}/api/v2/command-center/summary${query}`,
          `${API_BASE_URL}/api/v1/dashboard/summary${query}`
        ]),
        fetchFromCandidates<{ data?: WorkItemRow[] | OwnershipRow[] }>([
          `${API_BASE_URL}/api/v2/execution/board${query}`,
          `${API_BASE_URL}/api/v1/dashboard/ownership-board${query}`
        ]),
        fetchFromCandidates<{ data?: Agent[] }>([`${API_BASE_URL}/api/v1/agents`]),
        fetchFromCandidates<{ data?: Project[] }>([`${API_BASE_URL}/api/v1/projects`]),
        fetchFromCandidates<{ data?: Task[] }>([`${API_BASE_URL}/api/v1/tasks${query}`]),
        fetchFromCandidates<{ data?: ChatMessage[] }>([`${API_BASE_URL}/api/v1/chat/messages`]),
        fetchFromCandidates<{ data?: Activity[] }>([`${API_BASE_URL}/api/v1/activity?limit=30`])
      ]);

      const boardData = boardJson?.data ?? [];
      const normalizedWorkItems = Array.isArray(boardData) && boardData.length > 0 && "state" in boardData[0]
        ? (boardData as WorkItemRow[])
        : toWorkItems(boardData as OwnershipRow[]);

      setSummary(summaryJson?.data ?? DEFAULT_SUMMARY);
      setWorkItems(normalizedWorkItems);
      setAgents(agentsJson?.data ?? []);
      setProjects(projectsJson?.data ?? []);
      setTasks(tasksJson?.data ?? []);
      setChat(chatJson?.data ?? []);
      setActivity(activityJson?.data ?? []);
      setUpdatedAt(new Date().toLocaleString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Mission Control data");
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/v1/events/stream`);
    const refresh = () => loadData();
    const onError = () => setDegradedRealtime(true);
    const onOpen = () => setDegradedRealtime(false);

    eventSource.addEventListener("open", onOpen as EventListener);
    eventSource.addEventListener("chat", refresh);
    eventSource.addEventListener("activity", refresh);
    eventSource.addEventListener("error", onError as EventListener);

    return () => {
      eventSource.removeEventListener("open", onOpen as EventListener);
      eventSource.removeEventListener("chat", refresh);
      eventSource.removeEventListener("activity", refresh);
      eventSource.removeEventListener("error", onError as EventListener);
      eventSource.close();
    };
  }, [loadData]);

  useEffect(() => {
    if (!degradedRealtime) return;
    const id = window.setInterval(() => {
      loadData();
    }, 10000);
    return () => window.clearInterval(id);
  }, [degradedRealtime, loadData]);

  const countsByStatus = useMemo(() => {
    const map = { todo: 0, in_progress: 0, done: 0, blocked: 0 };
    for (const item of workItems) {
      if (item.state in map) map[item.state as keyof typeof map] += 1;
    }
    if (workItems.length === 0) {
      for (const t of tasks) {
        if (t.status in map) map[t.status as keyof typeof map] += 1;
      }
    }
    return map;
  }, [workItems, tasks]);

  const boardItems = useMemo(() => {
    return boardColumns.reduce<Record<string, WorkItemRow[]>>((acc, col) => {
      acc[col] = workItems.filter((item) => item.state === col);
      return acc;
    }, { todo: [], in_progress: [], blocked: [], done: [] });
  }, [workItems]);

  const bottleneckMetrics = useMemo(() => {
    const blocked = workItems.filter((item) => item.state === "blocked");
    const overdue = workItems.filter((item) => isOverdue(item.dueDate) && item.state !== "done");
    return {
      blockedCount: blocked.length,
      overdueCount: overdue.length,
      atRiskCount: blocked.length + overdue.length,
      topBlocked: blocked.slice(0, 3)
    };
  }, [workItems]);

  const agentHealth = useMemo(() => {
    return agents.map((agent) => {
      const assigned = tasks.filter((task) => task.agentId === agent.id);
      const blocked = assigned.filter((task) => task.status === "blocked").length;
      const inProgress = assigned.filter((task) => task.status === "in_progress").length;
      const done = assigned.filter((task) => task.status === "done").length;
      return {
        ...agent,
        workload: assigned.length,
        blocked,
        inProgress,
        done,
        blockedRatio: assigned.length ? Math.round((blocked / assigned.length) * 100) : 0
      };
    });
  }, [agents, tasks]);

  const setFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const createTask = async () => {
    if (!newTaskTitle.trim() || !projects[0] || !agents[0]) return;

    const v2Res = await fetch(`${API_BASE_URL}/api/v2/work-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({
        title: newTaskTitle,
        projectId: projects[0].id,
        ownerAgentId: agents[0].id,
        state: "todo",
        priority: "medium"
      })
    });

    if (!v2Res.ok) {
      await fetch(`${API_BASE_URL}/api/v1/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({
          title: newTaskTitle,
          projectId: projects[0].id,
          agentId: agents[0].id,
          status: "todo",
          priority: "medium"
        })
      });
    }

    setNewTaskTitle("");
    await loadData();
  };

  const postChat = async () => {
    if (!newChatMessage.trim()) return;
    await fetch(`${API_BASE_URL}/api/v1/chat/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ topic: "general", authorAgentId: "agent-jarvis", content: newChatMessage })
    });
    setNewChatMessage("");
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Mission Control</div>
        <nav>
          {navItems.map((item) => (
            <button key={item} className={`nav-item ${item === "Dashboard" ? "active" : ""}`} type="button">
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <div className="main-region">
        <header className="topbar">
          <div>
            <h1>Command Center</h1>
            <p className="muted">Now / Next / Risk visibility in one place</p>
          </div>
          <div className="topbar-actions">
            <button className="button" onClick={loadData}>Refresh</button>
            <span className="muted">{updatedAt ? `Last updated: ${updatedAt}` : ""}</span>
          </div>
        </header>

        {degradedRealtime ? <div className="notice warning">Realtime disconnected. Running polling fallback every 10s.</div> : null}
        {error ? <div className="notice error">{error}</div> : null}

        <section className="kpis">
          <article className="card"><h3>Total Agents</h3><p className="value">{summary.totals.agents}</p></article>
          <article className="card"><h3>Total Projects</h3><p className="value">{summary.totals.projects}</p></article>
          <article className="card"><h3>Total Work Items</h3><p className="value">{workItems.length || tasks.length}</p></article>
          <article className="card"><h3>In Progress</h3><p className="value">{countsByStatus.in_progress}</p></article>
          <article className="card"><h3>Blocked</h3><p className="value danger">{countsByStatus.blocked}</p></article>
          <article className="card"><h3>Overdue</h3><p className="value danger">{bottleneckMetrics.overdueCount}</p></article>
        </section>

        <section className="grid-2" style={{ marginTop: 0 }}>
          <article className="card">
            <h3>Execution Filters</h3>
            <div className="filters">
              <select className="input" value={filters.projectId} onChange={(e) => setFilter("projectId", e.target.value)}>
                <option value="">All Projects</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <select className="input" value={filters.agentId} onChange={(e) => setFilter("agentId", e.target.value)}>
                <option value="">All Agents</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
              <select className="input" value={filters.state} onChange={(e) => setFilter("state", e.target.value)}>
                <option value="">All States</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
              <select className="input" value={filters.priority} onChange={(e) => setFilter("priority", e.target.value)}>
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </article>

          <article className="card">
            <h3>Now / Next / Risk</h3>
            <p className="panel-line"><strong>Now:</strong> {countsByStatus.in_progress} items active across execution.</p>
            <p className="panel-line"><strong>Next:</strong> {countsByStatus.todo} items queued for execution.</p>
            <p className="panel-line"><strong>Risk:</strong> {bottleneckMetrics.atRiskCount} total (blocked + overdue).</p>
            <div className="chip-row">
              <span className="badge">Blocked: {bottleneckMetrics.blockedCount}</span>
              <span className="badge">Overloaded Agents: {summary.workload?.overloadedAgents ?? 0}</span>
            </div>
          </article>
        </section>

        <section className="card" style={{ marginTop: "0.75rem" }}>
          <div className="section-header">
            <h3 style={{ margin: 0 }}>Execution Board</h3>
            <div className="view-toggle">
              <button className={`button ${boardView === "board" ? "active-toggle" : ""}`} onClick={() => setBoardView("board")}>Board</button>
              <button className={`button ${boardView === "table" ? "active-toggle" : ""}`} onClick={() => setBoardView("table")}>Table</button>
            </div>
          </div>

          {boardView === "board" ? (
            <div className="kanban-grid">
              {boardColumns.map((column) => (
                <div className="kanban-col" key={column}>
                  <div className="kanban-col-header">{column.replace("_", " ")} · {boardItems[column].length}</div>
                  <div className="kanban-cards">
                    {boardItems[column].map((item) => (
                      <div className="kanban-card" key={item.id}>
                        <p className="kanban-title">{item.title}</p>
                        <p className="muted">{item.projectName} · {item.agentName}</p>
                        <div className="chip-row">
                          <span className="badge">{item.priority}</span>
                          {item.blocker ? <span className="badge danger-badge">blocked</span> : null}
                          {isOverdue(item.dueDate) ? <span className="badge danger-badge">overdue</span> : null}
                        </div>
                      </div>
                    ))}
                    {boardItems[column].length === 0 ? <p className="muted">No items</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Work Item</th><th>Project</th><th>Owner</th><th>State</th><th>Priority</th><th>Due</th><th>Blocker</th></tr></thead>
                <tbody>
                  {workItems.map((row) => (
                    <tr key={row.id}>
                      <td>{row.title}</td>
                      <td>{row.projectName}</td>
                      <td>{row.agentName}</td>
                      <td><span className="badge">{row.state}</span></td>
                      <td>{row.priority}</td>
                      <td className={isOverdue(row.dueDate) ? "danger" : ""}>{row.dueDate || "—"}</td>
                      <td>{row.blocker || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="primary-grid" style={{ marginTop: "0.75rem" }}>
          <article className="card">
            <h3>Agent Health Pulse</h3>
            <div className="agent-list">
              {agentHealth.map((agent) => (
                <div className="agent-row" key={agent.id}>
                  <div>
                    <p className="agent-name">{agent.name}</p>
                    <p className="muted">{agent.role} · {agent.status}</p>
                  </div>
                  <div className="agent-metrics">
                    <span>Load {agent.workload}</span>
                    <span>Active {agent.inProgress}</span>
                    <span className={agent.blocked > 0 ? "danger" : ""}>Blocked {agent.blocked}</span>
                    <span>{agent.blockedRatio}% risk</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <h3>Bottleneck Radar</h3>
            <div className="timeline">
              {bottleneckMetrics.topBlocked.map((item) => (
                <p key={item.id}><strong>{item.title}</strong> — {item.blocker || "Blocked"}</p>
              ))}
              {bottleneckMetrics.topBlocked.length === 0 ? <p className="muted">No active blockers 🎯</p> : null}
            </div>
          </article>
        </section>

        <section className="grid-2">
          <article className="card">
            <h3>Quick Add Task</h3>
            <input className="input" placeholder="Task title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
            <button className="button" onClick={createTask}>Create Task</button>
          </article>

          <article className="card">
            <h3>Watercooler Chat</h3>
            <div className="chat-box">
              {chat.slice(-8).map((m) => <p key={m.id}><strong>{m.authorAgentId}</strong>: {m.content}</p>)}
            </div>
            <input className="input" placeholder="Post update..." value={newChatMessage} onChange={(e) => setNewChatMessage(e.target.value)} />
            <button className="button" onClick={postChat}>Send</button>
          </article>
        </section>

        <section className="card" style={{ marginTop: "1rem" }}>
          <h3>Activity Timeline</h3>
          <div className="timeline">
            {activity.slice(0, 12).map((item) => (
              <p key={item.id}><strong>{item.type}/{item.action}</strong> — {item.summary} <span className="muted">({new Date(item.createdAt).toLocaleTimeString()})</span></p>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
