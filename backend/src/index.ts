import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { security } from './http/security.js';
import { globalRateLimit } from './http/rateLimit.js';
import { AppError } from './utils/errors.js';
import { logger } from './utils/logger.js';

import { authRoutes } from './routes/auth.routes.js';
import { forumRoutes } from './routes/forum.routes.js';
import { threadRoutes } from './routes/thread.routes.js';
import { postRoutes } from './routes/post.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { searchRoutes } from './routes/search.routes.js';
import { likeRoutes } from './routes/like.routes.js';
import { uploadRoutes } from './routes/upload.routes.js';
import { attachmentRoutes } from './routes/attachment.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import { shareRoutes } from './routes/share.routes.js';
import { badgeRoutes } from './routes/badge.routes.js';

const port = Number(process.env.PORT) || 3636;

// CORS — FRONTEND_URL may be a comma-separated list of origins; trailing slashes are tolerated.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Uploaded files live on disk under ./uploads and are served at /uploads.
const uploadsDir = path.join(process.cwd(), 'uploads');
// Ensure it exists on a fresh deploy (the dir is gitignored/dockerignored and
// otherwise only created lazily on first upload).
fs.mkdirSync(uploadsDir, { recursive: true });

const app = new Hono();

app.use('*', security);
app.use(
  '*',
  cors({
    // Allow non-browser requests (no Origin header) and any configured origin.
    origin: (origin) => {
      if (!origin) return origin;
      return allowedOrigins.includes(origin.replace(/\/+$/, '')) ? origin : null;
    },
    credentials: true,
  }),
);

// Serve uploaded files statically. CORP is set globally by `security` so the
// frontend (another origin) can load these images.
app.use(
  '/uploads/*',
  serveStatic({
    root: './',
  }),
);

// Global rate limiter (generous; skips /uploads inside the middleware).
app.use('*', globalRateLimit);

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/', (c) => c.text('IT.FORUM — Hono + Drizzle backend is running.'));

app.route('/auth', authRoutes);
app.route('/forums', forumRoutes);
app.route('/threads', threadRoutes);
app.route('/posts', postRoutes);
app.route('/users', userRoutes);
app.route('/search', searchRoutes);
app.route('/likes', likeRoutes);
app.route('/upload', uploadRoutes);
app.route('/upload/attachment', attachmentRoutes);
app.route('/admin', adminRoutes);
app.route('/reports', reportRoutes);
app.route('/share', shareRoutes);
app.route('/badges', badgeRoutes);

// Central error handler — preserves the `{ error: "..." }` contract the frontend expects.
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.statusCode as ContentfulStatusCode);
  }
  logger.error('Unhandled error', {
    name: (err as Error)?.name,
    message: (err as Error)?.message,
    stack: (err as Error)?.stack,
  });
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.notFound((c) => c.json({ error: 'Resource not found' }, 404));

Bun.serve({
  port,
  fetch: app.fetch,
  maxRequestBodySize: 16 * 1024 * 1024, // ≥10MB image uploads (same limit as before)
});
logger.info(`IT.FORUM Hono server listening on port ${port}`);
