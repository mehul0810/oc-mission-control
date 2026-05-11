import { Router } from 'express';
import { agents, projects, tasks } from '../data/seed';
import type { TaskStatus } from '../types';

const router = Router();

router.get('/summary', (_req, res) => {
  const statusBreakdown = tasks.reduce<Record<TaskStatus, number>>(
    (acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    },
    {
      todo: 0,
      in_progress: 0,
      done: 0,
      blocked: 0
    }
  );

  res.json({
    data: {
      totals: {
        agents: agents.length,
        projects: projects.length
      },
      tasks: statusBreakdown
    }
  });
});

router.get('/ownership-board', (req, res) => {
  const { projectId, agentId, status } = req.query;

  const filteredTasks = tasks.filter((task) => {
    if (projectId && task.projectId !== String(projectId)) return false;
    if (agentId && task.agentId !== String(agentId)) return false;
    if (status && task.status !== String(status as TaskStatus)) return false;
    return true;
  });

  const board = filteredTasks.map((task) => {
    const agent = agents.find((a) => a.id === task.agentId);
    const project = projects.find((p) => p.id === task.projectId);

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

  res.json({ data: board });
});

export default router;
