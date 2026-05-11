import { Router } from 'express';
import { tasks } from '../data/seed';
import type { TaskStatus } from '../types';

const router = Router();

router.get('/', (req, res) => {
  const { projectId, agentId, assigneeId, status } = req.query;
  const resolvedAssigneeId = assigneeId ? String(assigneeId) : agentId ? String(agentId) : undefined;

  const filtered = tasks.filter((task) => {
    if (projectId && task.projectId !== String(projectId)) return false;
    if (resolvedAssigneeId && task.agentId !== resolvedAssigneeId) return false;
    if (status && task.status !== String(status as TaskStatus)) return false;
    return true;
  });

  res.json({ data: filtered });
});

export default router;
