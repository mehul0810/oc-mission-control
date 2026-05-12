import { NextFunction, Request, Response } from 'express';
import { fail } from '../utils/api';

const ADMIN_KEY = process.env.MISSION_CONTROL_ADMIN_KEY || 'mission-control-admin';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const key = req.header('x-admin-key');
  if (!key || key !== ADMIN_KEY) {
    return fail(res, 401, 'UNAUTHORIZED', 'Admin key required for write operations. Provide x-admin-key header.');
  }

  return next();
}
