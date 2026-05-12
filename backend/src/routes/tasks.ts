import { Router } from 'express';
import { createTask, db, deleteTask, updateTask } from '../data/store';
import type { TaskStatus } from '../types';
import { fail, ok, requireNonEmptyString } from '../utils/api';

const router = Router();

router.get('/', (req, res) => {
  const { projectId, agentId, assigneeId, status } = req.query;
  const resolvedAssigneeId = assigneeId ? String(assigneeId) : agentId ? String(agentId) : undefined;

  const filtered = db.tasks.filter((task) => {
    if (projectId && task.projectId !== String(projectId)) return false;
    if (resolvedAssigneeId && task.agentId !== resolvedAssigneeId) return false;
    if (status && task.status !== String(status as TaskStatus)) return false;
    return true;
  });

  return ok(res, filtered);
});

router.get('/:id', (req, res) => {
  const task = db.tasks.find((item) => item.id === req.params.id);
  if (!task) {
    return fail(res, 404, 'NOT_FOUND', 'Task not found');
  }

  return ok(res, task);
});

router.post('/', (req, res) => {
  const { title, projectId, agentId, status = 'todo', priority = 'medium', dueDate, blocker } = req.body as {
    title?: string;
    projectId?: string;
    agentId?: string;
    status?: TaskStatus;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    dueDate?: string;
    blocker?: string;
  };

  const validatedTitle = requireNonEmptyString(title, 'title');
  const validatedProjectId = requireNonEmptyString(projectId, 'projectId');
  const validatedAgentId = requireNonEmptyString(agentId, 'agentId');

  if (!validatedTitle || !validatedProjectId || !validatedAgentId) {
    return fail(res, 400, 'VALIDATION_ERROR', 'title, projectId and agentId are required');
  }

  const task = createTask({
    title: validatedTitle,
    projectId: validatedProjectId,
    agentId: validatedAgentId,
    status,
    priority,
    dueDate,
    blocker
  });
  return ok(res, task, 201);
});

router.patch('/:id', (req, res) => {
  const updated = updateTask(req.params.id, req.body ?? {});
  if (!updated) {
    return fail(res, 404, 'NOT_FOUND', 'Task not found');
  }

  return ok(res, updated);
});

router.delete('/:id', (req, res) => {
  const deleted = deleteTask(req.params.id);
  if (!deleted) {
    return fail(res, 404, 'NOT_FOUND', 'Task not found');
  }

  return ok(res, deleted);
});

export default router;
