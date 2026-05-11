import { Router } from 'express';
import { projects } from '../data/seed';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ data: projects });
});

export default router;
