import { Router } from 'express';
import { agents } from '../data/seed';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ data: agents });
});

export default router;
