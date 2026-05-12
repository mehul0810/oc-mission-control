import express, { NextFunction, Request, Response } from 'express';
import agentsRouter from './routes/agents';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import dashboardRouter from './routes/dashboard';
import chatRouter from './routes/chat';
import activityRouter from './routes/activity';
import eventsRouter from './routes/events';
import { requireAdmin } from './middleware/adminAuth';
import { fail, ok } from './utils/api';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3001');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

app.get('/api/v1/health', (_req, res) => {
  return ok(res, { status: 'ok' });
});

app.use('/api/v1/events', eventsRouter);

app.use(['/api/v1/projects', '/api/v1/tasks', '/api/v1/agents', '/api/v1/chat'], (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  return requireAdmin(req, res, next);
});

app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/activity', activityRouter);

app.use((_req, res) => {
  return fail(res, 404, 'NOT_FOUND', 'Not Found');
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  return fail(res, 500, 'INTERNAL_SERVER_ERROR', err.message || 'Internal Server Error');
});

app.listen(port, () => {
  console.log(`Mission Control backend running on http://localhost:${port}`);
});
