import { Router } from 'express';
import { db, getTaskStatusBreakdown } from '../data/store';
import type { TaskStatus } from '../types';
import { ok } from '../utils/api';

const router = Router();

router.get('/summary', (req, res) => {
  const { projectId, agentId, status } = req.query;
  const filteredTasks = db.tasks.filter((task) => {
    if (projectId && task.projectId !== String(projectId)) return false;
    if (agentId && task.agentId !== String(agentId)) return false;
    if (status && task.status !== String(status as TaskStatus)) return false;
    return true;
  });

  return ok(res, {
    totals: {
      agents: db.agents.length,
      projects: db.projects.length,
      tasks: filteredTasks.length
    },
    tasks: getTaskStatusBreakdown(filteredTasks)
  });
});

router.get('/ownership-board', (req, res) => {
  const { projectId, agentId, status } = req.query;

  const filteredTasks = db.tasks.filter((task) => {
    if (projectId && task.projectId !== String(projectId)) return false;
    if (agentId && task.agentId !== String(agentId)) return false;
    if (status && task.status !== String(status as TaskStatus)) return false;
    return true;
  });

  const board = filteredTasks.map((task) => {
    const agent = db.agents.find((a) => a.id === task.agentId);
    const project = db.projects.find((p) => p.id === task.projectId);

    return {
      taskId: task.id,
      title: task.title,
      project: project?.id ?? task.projectId,
      projectName: project?.name ?? 'Unknown Project',
      assignee: agent?.id ?? task.agentId,
      agentName: agent?.name ?? 'Unassigned',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? null,
      blocker: task.blocker ?? null
    };
  });

  return ok(res, board);
});

export default router;
