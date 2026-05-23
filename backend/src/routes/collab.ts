import { Router } from 'express';
import { createCollabMessage, createCollabThread, db } from '../data/store';
import { fail, ok, requireNonEmptyString } from '../utils/api';

const router = Router();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseLimit(value: unknown): number {
  const limit = Number(value);
  if (!Number.isFinite(limit) || limit < 1) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(limit));
}

function encodeCursor(createdAt: string, id: string) {
  return Buffer.from(`${createdAt}|${id}`, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const [createdAt, id] = decoded.split('|');
    if (!createdAt || !id || !Number.isFinite(Date.parse(createdAt))) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

router.post('/threads', (req, res) => {
  const { projectId, title, createdByAgentId } = req.body as {
    projectId?: unknown;
    title?: unknown;
    createdByAgentId?: unknown;
  };

  const validProjectId = requireNonEmptyString(projectId, 'projectId');
  const validTitle = requireNonEmptyString(title, 'title');
  const validActorId = requireNonEmptyString(createdByAgentId, 'createdByAgentId');

  if (!validProjectId || !validTitle || !validActorId) {
    return fail(res, 400, 'VALIDATION_ERROR', 'projectId, title, and createdByAgentId are required');
  }

  const projectExists = db.projects.some((project) => project.id === validProjectId);
  if (!projectExists) {
    return fail(res, 404, 'NOT_FOUND', 'Project not found');
  }

  const actorExists = db.agents.some((agent) => agent.id === validActorId);
  if (!actorExists) {
    return fail(res, 400, 'VALIDATION_ERROR', 'createdByAgentId must be a known agent ID');
  }

  const thread = createCollabThread({
    projectId: validProjectId,
    title: validTitle,
    createdByAgentId: validActorId
  });

  return ok(res, thread, 201);
});

router.post('/messages', (req, res) => {
  const { threadId, projectId, actorAgentId, body, mentions = [] } = req.body as {
    threadId?: unknown;
    projectId?: unknown;
    actorAgentId?: unknown;
    body?: unknown;
    mentions?: unknown;
  };

  const validThreadId = requireNonEmptyString(threadId, 'threadId');
  const validProjectId = requireNonEmptyString(projectId, 'projectId');
  const validActorId = requireNonEmptyString(actorAgentId, 'actorAgentId');
  const validBody = requireNonEmptyString(body, 'body');

  if (!validThreadId || !validProjectId || !validActorId || !validBody) {
    return fail(res, 400, 'VALIDATION_ERROR', 'threadId, projectId, actorAgentId, and body are required');
  }

  if (validBody.length > 5000) {
    return fail(res, 400, 'VALIDATION_ERROR', 'body must be between 1 and 5000 characters');
  }

  if (!Array.isArray(mentions)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'mentions must be an array of agent IDs');
  }

  if (mentions.length > 20) {
    return fail(res, 400, 'VALIDATION_ERROR', 'mentions supports a maximum of 20 agent IDs');
  }

  const thread = db.collabThreads.find((item) => item.id === validThreadId);
  if (!thread || thread.projectId !== validProjectId) {
    return fail(res, 404, 'NOT_FOUND', 'Thread not found for given project');
  }

  const actorExists = db.agents.some((agent) => agent.id === validActorId);
  if (!actorExists) {
    return fail(res, 400, 'VALIDATION_ERROR', 'actorAgentId must be a known agent ID');
  }

  const cleanMentions = mentions.map((mention) => String(mention).trim()).filter(Boolean);
  const uniqueMentions = Array.from(new Set(cleanMentions));
  const unknownMentions = uniqueMentions.filter((mention) => !db.agents.some((agent) => agent.id === mention));

  if (unknownMentions.length) {
    return fail(res, 400, 'UNKNOWN_MENTIONS', 'mentions contains unknown agent IDs', unknownMentions);
  }

  const message = createCollabMessage({
    threadId: validThreadId,
    projectId: validProjectId,
    actorAgentId: validActorId,
    body: validBody,
    mentions: uniqueMentions
  });

  return ok(
    res,
    {
      id: message.id,
      threadId: message.threadId,
      createdAt: message.createdAt
    },
    201
  );
});

router.get('/messages', (req, res) => {
  const threadId = req.query.threadId ? String(req.query.threadId) : undefined;
  const projectId = req.query.projectId ? String(req.query.projectId) : undefined;

  if (!threadId && !projectId) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Either threadId or projectId query param is required');
  }

  const limit = parseLimit(req.query.limit);
  const page = req.query.page ? Math.max(1, Math.floor(Number(req.query.page))) : null;
  const cursorRaw = req.query.cursor ? String(req.query.cursor) : null;

  let filtered = db.collabMessages
    .filter((item) => {
      if (threadId && item.threadId !== threadId) return false;
      if (projectId && item.projectId !== projectId) return false;
      return true;
    })
    .sort((a, b) => {
      const ts = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (ts !== 0) return ts;
      return b.id.localeCompare(a.id);
    });

  if (cursorRaw) {
    const cursor = decodeCursor(cursorRaw);
    if (!cursor) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Invalid cursor');
    }
    filtered = filtered.filter((item) => {
      if (item.createdAt < cursor.createdAt) return true;
      if (item.createdAt > cursor.createdAt) return false;
      return item.id < cursor.id;
    });
  }

  const offset = page ? (page - 1) * limit : 0;
  const windowed = page ? filtered.slice(offset, offset + limit) : filtered.slice(0, limit);
  const last = windowed[windowed.length - 1];

  return res.status(200).json({
    data: {
      items: windowed
    },
    meta: {
      count: windowed.length,
      limit,
      page,
      nextCursor: last ? encodeCursor(last.createdAt, last.id) : null
    }
  });
});

export default router;
