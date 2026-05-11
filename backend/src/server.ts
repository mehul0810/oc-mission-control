import express, { NextFunction, Request, Response } from 'express';
import agentsRouter from './routes/agents';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import dashboardRouter from './routes/dashboard';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/dashboard', dashboardRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Not Found'
    }
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal Server Error'
    }
  });
});

app.listen(port, () => {
  console.log(`Mission Control backend running on http://localhost:${port}`);
});
