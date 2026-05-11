"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Summary = {
  totals: {
    agents: number;
    projects: number;
  };
  tasks: {
    todo: number;
    in_progress: number;
    done: number;
    blocked: number;
  };
};

type OwnershipRow = {
  taskId?: string;
  task?: string;
  title?: string;
  project?: string;
  projectName?: string;
  assignee?: string;
  agentName?: string;
  status?: "todo" | "in_progress" | "done" | "blocked" | string;
  priority?: string;
  dueDate?: string | null;
  blocker?: string | null;
};

type Filters = {
  project: string;
  agent: string;
  status: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const DEFAULT_SUMMARY: Summary = {
  totals: { agents: 0, projects: 0 },
  tasks: { todo: 0, in_progress: 0, done: 0, blocked: 0 }
};

export default function Page() {
  const [summary, setSummary] = useState<Summary>(DEFAULT_SUMMARY);
  const [rows, setRows] = useState<OwnershipRow[]>([]);
  const [filters, setFilters] = useState<Filters>({ project: "all", agent: "all", status: "all" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters({
      project: params.get("project") || "all",
      agent: params.get("agent") || "all",
      status: params.get("status") || "all"
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, boardRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/dashboard/summary`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/v1/dashboard/ownership-board`, { cache: "no-store" })
      ]);

      if (!summaryRes.ok || !boardRes.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const summaryJson = await summaryRes.json();
      const boardJson = await boardRes.json();

      setSummary(summaryJson.data ?? summaryJson ?? DEFAULT_SUMMARY);
      setRows((boardJson.data ?? boardJson ?? []) as OwnershipRow[]);
      setUpdatedAt(new Date().toLocaleString());
    } catch (e) {
      setSummary(DEFAULT_SUMMARY);
      setRows([]);
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const projectOptions = useMemo(
    () => ["all", ...new Set(rows.map((r) => r.projectName || r.project).filter(Boolean) as string[])],
    [rows]
  );
  const agentOptions = useMemo(
    () => ["all", ...new Set(rows.map((r) => r.agentName || r.assignee).filter(Boolean) as string[])],
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const project = row.projectName || row.project || "";
      const agent = row.agentName || row.assignee || "";
      const status = row.status || "";

      const projectMatch = filters.project === "all" || project === filters.project;
      const agentMatch = filters.agent === "all" || agent === filters.agent;
      const statusMatch = filters.status === "all" || status === filters.status;

      return projectMatch && agentMatch && statusMatch;
    });
  }, [rows, filters]);

  const filteredCounters = useMemo(() => {
    const counters = { todo: 0, in_progress: 0, done: 0, blocked: 0 };
    for (const row of filteredRows) {
      const status = row.status;
      if (status === "todo" || status === "in_progress" || status === "done" || status === "blocked") {
        counters[status] += 1;
      }
    }
    return counters;
  }, [filteredRows]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.project !== "all") params.set("project", filters.project);
    if (filters.agent !== "all") params.set("agent", filters.agent);
    if (filters.status !== "all") params.set("status", filters.status);
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [filters]);

  return (
    <main className="container">
      <div className="header">
        <h1>Mission Control</h1>
        <span className="muted">{updatedAt ? `Last updated: ${updatedAt}` : ""}</span>
      </div>

      <section className="filters">
        <select
          className="select"
          value={filters.project}
          onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value }))}
        >
          {projectOptions.map((project) => (
            <option key={project} value={project}>
              {project === "all" ? "All Projects" : project}
            </option>
          ))}
        </select>

        <select
          className="select"
          value={filters.agent}
          onChange={(e) => setFilters((f) => ({ ...f, agent: e.target.value }))}
        >
          {agentOptions.map((agent) => (
            <option key={agent} value={agent}>
              {agent === "all" ? "All Agents" : agent}
            </option>
          ))}
        </select>

        <select
          className="select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="all">All Statuses</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
        </select>
      </section>

      {loading ? (
        <div className="notice">Loading dashboard data…</div>
      ) : error ? (
        <div className="notice error">
          <div>{error}</div>
          <button className="button" onClick={loadData}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="kpis">
            <article className="card">
              <h3>Total Agents</h3>
              <p className="value">{summary.totals?.agents ?? 0}</p>
            </article>
            <article className="card">
              <h3>Total Projects</h3>
              <p className="value">{summary.totals?.projects ?? 0}</p>
            </article>
            <article className="card">
              <h3>Todo</h3>
              <p className="value">{filteredCounters.todo}</p>
            </article>
            <article className="card">
              <h3>In Progress</h3>
              <p className="value">{filteredCounters.in_progress}</p>
            </article>
            <article className="card">
              <h3>Done</h3>
              <p className="value">{filteredCounters.done}</p>
            </article>
            <article className="card">
              <h3>Blocked</h3>
              <p className="value">{filteredCounters.blocked}</p>
            </article>
          </section>

          {filteredRows.length === 0 ? (
            <div className="notice">No tasks match current filters.</div>
          ) : (
            <section className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Blocker</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={row.taskId || `${row.title || row.task}-${index}`}>
                      <td>{row.title || row.task || "—"}</td>
                      <td className="row-muted">{row.projectName || row.project || "—"}</td>
                      <td>{row.agentName || row.assignee || "Unassigned"}</td>
                      <td>
                        <span className="badge">{row.status || "—"}</span>
                      </td>
                      <td>{row.priority || "—"}</td>
                      <td>{row.dueDate || "—"}</td>
                      <td>{row.blocker || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </main>
  );
}
