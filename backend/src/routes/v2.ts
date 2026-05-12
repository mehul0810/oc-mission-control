import { Router } from 'express';
import { createTask, db, updateTask } from '../data/store';
import type { Task, TaskStatus } from '../types';
import { fail, ok, requireNonEmptyString } from '../utils/api';

const router = Router();

type WorkItemState = TaskStatus;
type WorkItemPriority = 'p0' | 'p1' | 'p2' | 'p3';

const taskToWorkItemPriority: Record<Task['priority'], WorkItemPriority> = {
  critical: 'p0',
  high: 'p1',
  medium: 'p2',
  low: 'p3',
  p0: 'p0',
  p1: 'p1',
  p2: 'p2',
  p3: 'p3'
};

const workItemToTaskPriority: Record<WorkItemPriority, Task['priority']> = {
  p0: 'critical',
  p1: 'high',
  p2: 'medium',
  p3: 'low'
};

const allowedStates: WorkItemState[] = ['todo', 'in_progress', 'blocked', 'done'];
const allowedPriorities: WorkItemPriority[] = ['p0', 'p1', 'p2', 'p3'];

function parseState(value: unknown): WorkItemState | null {
  if (typeof value !== 'string') return null;
  return allowedStates.includes(value as WorkItemState) ? (value as WorkItemState) : null;
}

function parsePriority(value: unknown): WorkItemPriority | null {
  if (typeof value !== 'string') return null;
  return allowedPriorities.includes(value as WorkItemPriority) ? (value as WorkItemPriority) : null;
}

function isTransitionAllowed(fromState: WorkItemState, toState: WorkItemState) {
  if (fromState === 'todo') return toState === 'in_progress' || toState === 'blocked';
  if (fromState === 'in_progress') return toState === 'blocked' || toState === 'done';
  if (fromState === 'blocked') return toState === 'in_progress' || toState === 'done';
  if (fromState === 'done') return toState === 'in_progress';
  return false;
}

function toWorkItem(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    projectId: task.projectId,
    ownerAgentId: task.agentId,
    state: task.status,
    priority: taskToWorkItemPriority[task.priority],
    effortPoints: task.effortPoints ?? null,
    slaDueAt: task.slaDueAt ?? null,
    blockerReason: task.blocker ?? null,
    createdAt: task.createdAt ?? null,
    updatedAt: task.updatedAt ?? null
  };
}

router.get('/command-center/summary', (_req, res) => {
  const now = Date.now();
  const activeTasks = db.tasks.filter((task) => task.status !== 'done');
  const blockedItems = activeTasks.filter((task) => task.status === 'blocked').length;
  const overdueItems = activeTasks.filter((task) => {
    const due = task.slaDueAt ?? task.dueDate;
    if (!due) return false;
    const ts = Date.parse(due);
    return Number.isFinite(ts) && ts < now;
  }).length;

  const activeLoadByAgent = activeTasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.agentId] = (acc[task.agentId] ?? 0) + 1;
    return acc;
  }, {});

  const overloadedAgents = Object.values(activeLoadByAgent).filter((count) => count >= 4).length;

  const riskScore = blockedItems + overdueItems + overloadedAgents;
  const riskLevel = riskScore >= 8 ? 'high' : riskScore >= 4 ? 'medium' : 'low';

  return ok(res, {
    kpis: {
      activeItems: activeTasks.length,
      blockedItems,
      overdueItems,
      overloadedAgents
    },
    riskLevel,
    generatedAt: new Date().toISOString()
  });
});

router.get('/work-items', (req, res) => {
  const { state, ownerAgentId, projectId, priority } = req.query;

  const parsedState = state ? parseState(state) : null;
  if (state && !parsedState) {
    return fail(res, 400, 'VALIDATION_ERROR', 'state must be one of todo|in_progress|blocked|done');
  }

  const parsedPriority = priority ? parsePriority(priority) : null;
  if (priority && !parsedPriority) {
    return fail(res, 400, 'VALIDATION_ERROR', 'priority must be one of p0|p1|p2|p3');
  }

  const items = db.tasks
    .filter((task) => {
      if (parsedState && task.status !== parsedState) return false;
      if (ownerAgentId && task.agentId !== String(ownerAgentId)) return false;
      if (projectId && task.projectId !== String(projectId)) return false;
      if (parsedPriority && taskToWorkItemPriority[task.priority] !== parsedPriority) return false;
      return true;
    })
    .map(toWorkItem);

  return ok(res, items);
});

router.get('/work-items/:id', (req, res) => {
  const task = db.tasks.find((item) => item.id === req.params.id);
  if (!task) {
    return fail(res, 404, 'NOT_FOUND', 'Work item not found');
  }

  return ok(res, toWorkItem(task));
});

router.post('/work-items', (req, res) => {
  const { title, description, projectId, ownerAgentId, priority = 'p2', effortPoints, slaDueAt } = req.body as {
    title?: unknown;
    description?: unknown;
    projectId?: unknown;
    ownerAgentId?: unknown;
    priority?: unknown;
    effortPoints?: unknown;
    slaDueAt?: unknown;
  };

  const validatedTitle = requireNonEmptyString(title, 'title');
  if (!validatedTitle || validatedTitle.length < 3 || validatedTitle.length > 160) {
    return fail(res, 400, 'VALIDATION_ERROR', 'title is required and must be 3-160 characters');
  }

  const validatedProjectId = requireNonEmptyString(projectId, 'projectId');
  const validatedOwnerAgentId = requireNonEmptyString(ownerAgentId, 'ownerAgentId');
  if (!validatedProjectId || !validatedOwnerAgentId) {
    return fail(res, 400, 'VALIDATION_ERROR', 'projectId and ownerAgentId are required');
  }

  const validatedPriority = parsePriority(priority);
  if (!validatedPriority) {
    return fail(res, 400, 'VALIDATION_ERROR', 'priority must be one of p0|p1|p2|p3');
  }

  if (!Number.isInteger(effortPoints) || Number(effortPoints) < 1 || Number(effortPoints) > 13) {
    return fail(res, 400, 'VALIDATION_ERROR', 'effortPoints must be an integer between 1 and 13');
  }

  let validatedDescription: string | undefined;
  if (description != null) {
    const parsedDescription = requireNonEmptyString(description, 'description');
    if (!parsedDescription) {
      return fail(res, 400, 'VALIDATION_ERROR', 'description must be a non-empty string when provided');
    }
    validatedDescription = parsedDescription;
  }

  if (slaDueAt != null && (typeof slaDueAt !== 'string' || !Number.isFinite(Date.parse(slaDueAt)))) {
    return fail(res, 400, 'VALIDATION_ERROR', 'slaDueAt must be a valid ISO-8601 datetime when provided');
  }

  const now = new Date().toISOString();
  const task = createTask({
    title: validatedTitle,
    description: validatedDescription,
    projectId: validatedProjectId,
    agentId: validatedOwnerAgentId,
    status: 'todo',
    priority: workItemToTaskPriority[validatedPriority],
    effortPoints: Number(effortPoints),
    slaDueAt: typeof slaDueAt === 'string' ? slaDueAt : undefined,
    createdAt: now,
    updatedAt: now
  });

  return ok(
    res,
    {
      id: task.id,
      state: task.status,
      createdAt: task.createdAt
    },
    201
  );
});

router.patch('/work-items/:id/transition', (req, res) => {
  const task = db.tasks.find((item) => item.id === req.params.id);
  if (!task) {
    return fail(res, 404, 'NOT_FOUND', 'Work item not found');
  }

  const { toState, reason } = req.body as { toState?: unknown; reason?: unknown };
  const parsedToState = parseState(toState);
  if (!parsedToState) {
    return fail(res, 400, 'VALIDATION_ERROR', 'toState must be one of todo|in_progress|blocked|done');
  }

  if (!isTransitionAllowed(task.status, parsedToState)) {
    return fail(res, 409, 'INVALID_TRANSITION', `Invalid transition from ${task.status} to ${parsedToState}`);
  }

  if (task.status === 'done' && parsedToState === 'in_progress' && !requireNonEmptyString(reason, 'reason')) {
    return fail(res, 400, 'VALIDATION_ERROR', 'reason is required when reopening done items');
  }

  const fromState = task.status;
  const updatedAt = new Date().toISOString();
  let blockerReason: string | undefined;
  if (parsedToState === 'blocked') {
    const parsedReason = requireNonEmptyString(reason, 'reason');
    blockerReason = parsedReason ?? task.blocker;
  }
  const updated = updateTask(task.id, {
    status: parsedToState,
    blocker: blockerReason,
    updatedAt
  });

  if (!updated) {
    return fail(res, 404, 'NOT_FOUND', 'Work item not found');
  }

  return ok(res, {
    id: updated.id,
    fromState,
    toState: updated.status,
    updatedAt: updated.updatedAt ?? updatedAt
  });
});

export default router;
