import { Router } from 'express';
import { db, updateAgentStatus } from '../data/store';
import type { AgentStatus } from '../types';
import { fail, ok } from '../utils/api';

const router = Router();

router.get('/', (_req, res) => {
  return ok(res, db.agents);
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body as { status?: AgentStatus };
  if (!status || !['active', 'idle', 'offline', 'away'].includes(status)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Invalid agent status');
  }

  const updated = updateAgentStatus(req.params.id, status);
  if (!updated) {
    return fail(res, 404, 'NOT_FOUND', 'Agent not found');
  }

  return ok(res, updated);
});

export default router;
