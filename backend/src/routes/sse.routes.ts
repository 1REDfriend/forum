import { Hono } from 'hono';
import { verifyBearer } from '../http/auth.js';
import { realtimeService } from '../services/realtime.service.js';

/**
 * GET /sse/events?token=...  (EventSource cannot set Authorization headers easily)
 * Streams notification/dm events for the authenticated user.
 */
export const sseRoutes = new Hono().get('/events', async (c) => {
  const token =
    c.req.query('token') ||
    (c.req.header('authorization')?.startsWith('Bearer ')
      ? c.req.header('authorization')!.slice(7)
      : null);
  const payload = verifyBearer(token ? `Bearer ${token}` : undefined);
  if (!payload) return c.json({ error: 'Unauthorized' }, 401);

  const userId = payload.userId;
  let cleanup: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* closed */
        }
      };
      send(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
      cleanup = realtimeService.subscribe(userId, send);
      heartbeat = setInterval(() => {
        send(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
      }, 25000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      cleanup?.();
    },
  });

  // CORS for cross-origin EventSource (Vite :5173 → API :3636)
  const origin = c.req.header('origin') ?? '';
  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }

  return new Response(stream, { headers });
});
