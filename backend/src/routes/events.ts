import { Router } from 'express';
import { eventBus } from '../data/store';
import type { EventChannel, EventPayload, HeartbeatEvent, StreamConnectedEvent } from '../types';

const router = Router();
const HEARTBEAT_MS = 15000;

const sendEvent = <T extends EventChannel>(
  write: (chunk: string) => void,
  payload: EventPayload<T>
) => {
  write(`event: ${payload.channel}\n`);
  write(`data: ${JSON.stringify(payload.data)}\n\n`);
};

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.write('retry: 5000\n\n');
  res.flushHeaders();

  const send = (payload: EventPayload<EventChannel>) => sendEvent(res.write.bind(res), payload);
  const connectedPayload: StreamConnectedEvent = { ts: new Date().toISOString(), heartbeatMs: HEARTBEAT_MS };
  sendEvent(res.write.bind(res), { channel: 'system', data: connectedPayload });

  const ping = setInterval(() => {
    const heartbeatPayload: HeartbeatEvent = { ts: new Date().toISOString() };
    sendEvent(res.write.bind(res), { channel: 'system', data: heartbeatPayload });
  }, HEARTBEAT_MS);

  eventBus.listeners.add(send);

  req.on('close', () => {
    clearInterval(ping);
    eventBus.listeners.delete(send);
    res.end();
  });
});

export default router;
