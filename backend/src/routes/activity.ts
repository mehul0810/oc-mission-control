import { Router } from 'express';
import { db } from '../data/store';
import { ok } from '../utils/api';

const router = Router();

router.get('/', (req, res) => {
  const type = req.query.type ? String(req.query.type) : undefined;
  const actorAgentId = req.query.actorAgentId ? String(req.query.actorAgentId) : undefined;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

  const data = db.activities
    .filter((item) => {
      if (type && item.type !== type) return false;
      if (actorAgentId && item.actorAgentId !== actorAgentId) return false;
      return true;
    })
    .slice(0, limit);

  return ok(res, data);
});

export default router;
