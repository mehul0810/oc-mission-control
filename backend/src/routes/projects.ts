import { Router } from 'express';
import { createProject, db, updateProject } from '../data/store';
import { fail, ok, requireNonEmptyString } from '../utils/api';

const router = Router();

router.get('/', (_req, res) => {
  return ok(res, db.projects);
});

router.post('/', (req, res) => {
  const { name, slug, status = 'planning', ownerAgentId } = req.body as {
    name?: string;
    slug?: string;
    status?: 'active' | 'planning' | 'paused' | 'completed';
    ownerAgentId?: string;
  };

  const validName = requireNonEmptyString(name, 'name');
  const validOwnerAgentId = requireNonEmptyString(ownerAgentId, 'ownerAgentId');

  if (!validName || !validOwnerAgentId) {
    return fail(res, 400, 'VALIDATION_ERROR', 'name and ownerAgentId are required');
  }

  const project = createProject({ name: validName, slug, status, ownerAgentId: validOwnerAgentId });
  return ok(res, project, 201);
});

router.patch('/:id', (req, res) => {
  const updated = updateProject(req.params.id, req.body ?? {});
  if (!updated) {
    return fail(res, 404, 'NOT_FOUND', 'Project not found');
  }

  return ok(res, updated);
});

export default router;
