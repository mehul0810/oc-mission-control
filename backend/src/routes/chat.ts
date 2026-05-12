import { Router } from 'express';
import { createChatMessage, db } from '../data/store';
import { fail, ok, requireNonEmptyString } from '../utils/api';

const router = Router();

router.get('/messages', (req, res) => {
  const topic = req.query.topic ? String(req.query.topic) : undefined;
  const q = req.query.q ? String(req.query.q).toLowerCase() : undefined;

  const data = db.chatMessages.filter((message) => {
    if (topic && message.topic !== topic) return false;
    if (q && !message.content.toLowerCase().includes(q)) return false;
    return true;
  });

  return ok(res, data);
});

router.post('/messages', (req, res) => {
  const { topic = 'general', authorAgentId, content } = req.body as {
    topic?: string;
    authorAgentId?: string;
    content?: string;
  };

  const validAuthorAgentId = requireNonEmptyString(authorAgentId, 'authorAgentId');
  const validContent = requireNonEmptyString(content, 'content');

  if (!validAuthorAgentId || !validContent) {
    return fail(res, 400, 'VALIDATION_ERROR', 'authorAgentId and content are required');
  }

  const message = createChatMessage({ topic, authorAgentId: validAuthorAgentId, content: validContent });
  return ok(res, message, 201);
});

export default router;
