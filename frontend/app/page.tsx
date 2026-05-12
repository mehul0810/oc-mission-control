"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Summary = {
  totals: { agents: number; projects: number; tasks?: number };
  tasks: { todo: number; in_progress: number; done: number; blocked: number };
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "mission-control-admin";
const DEFAULT_SUMMARY: Summary = { totals: { agents: 0, projects: 0, tasks: 0 }, tasks: { todo: 0, in_progress: 0, done: 0, blocked: 0 } };

const navItems = ["Dashboard", "Work Board", "Projects", "Agents", "Activity", "Chat", "Settings"];

export default function Page() {
  const [summary, setSummary] = useState<Summary>(DEFAULT_SUMMARY);
  const [rows, setRows] = useState<OwnershipRow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [summaryRes, boardRes, agentsRes, projectsRes, tasksRes, chatRes, activityRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/dashboard/summary`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/v1/dashboard/ownership-board`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/v1/agents`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/v1/projects`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/v1/tasks`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/v1/chat/messages`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/v1/activity?limit=30`, { cache: "no-store" })
      ]);

      const [summaryJson, boardJson, agentsJson, projectsJson, tasksJson, chatJson, activityJson] = await Promise.all([
        summaryRes.json(),
        boardRes.json(),
        agentsRes.json(),
        projectsRes.json(),
        tasksRes.json(),
        chatRes.json(),
        activityRes.json()
      ]);

      setSummary(summaryJson.data ?? DEFAULT_SUMMARY);
      setRows(boardJson.data ?? []);
      setAgents(agentsJson.data ?? []);
      setProjects(projectsJson.data ?? []);
      setTasks(tasksJson.data ?? []);
      setChat(chatJson.data ?? []);
      setActivity(activityJson.data ?? []);
      setUpdatedAt(new Date().toLocaleString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Mission Control data");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/v1/events/stream`);
    const refresh = () => loadData();
    eventSource.addEventListener("chat", refresh);
    eventSource.addEventListener("activity", refresh);
    return () => {
      eventSource.removeEventListener("chat", refresh);
      eventSource.removeEventListener("activity", refresh);
      eventSource.close();
    };
  }, [loadData]);

  const countsByStatus = useMemo(() => {
    const map = { todo: 0, in_progress: 0, done: 0, blocked: 0 };
    for (const t of tasks) {
      if (t.status in map) map[t.status as keyof typeof map] += 1;
    }
    return map;
  }, [tasks]);

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

  const createTask = async () => {
    if (!newTaskTitle.trim() || !projects[0] || !agents[0]) return;
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

        {error ? <div className="notice error">{error}</div> : null}

        <section className="kpis">
          <article className="card"><h3>Total Agents</h3><p className="value">{summary.totals.agents}</p></article>
          <article className="card"><h3>Total Projects</h3><p className="value">{summary.totals.projects}</p></article>
          <article className="card"><h3>Total Tasks</h3><p className="value">{tasks.length}</p></article>
          <article className="card"><h3>Todo</h3><p className="value">{countsByStatus.todo}</p></article>
          <article className="card"><h3>In Progress</h3><p className="value">{countsByStatus.in_progress}</p></article>
          <article className="card"><h3>Blocked</h3><p className="value danger">{countsByStatus.blocked}</p></article>
        </section>

        <section className="primary-grid">
          <article className="card">
            <h3>Ownership Board</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due</th><th>Blocker</th></tr></thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.taskId || `${row.title}-${index}`}>
                      <td>{row.title || "—"}</td>
                      <td>{row.projectName || "—"}</td>
                      <td>{row.agentName || "—"}</td>
                      <td><span className="badge">{row.status || "—"}</span></td>
                      <td>{row.priority || "—"}</td>
                      <td>{row.dueDate || "—"}</td>
                      <td>{row.blocker || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

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
