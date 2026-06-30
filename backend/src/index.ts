import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';

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
// Ensure it exists so the static plugin can initialise on a fresh deploy (the dir is
// gitignored/dockerignored and otherwise only created lazily on first upload).
fs.mkdirSync(uploadsDir, { recursive: true });

new Elysia({ serve: { maxRequestBodySize: 16 * 1024 * 1024 } }) // ≥10MB image uploads
  .use(security)
  .use(
    cors({
      // Allow non-browser requests (no Origin header) and any configured origin.
      origin(request) {
        const origin = request.headers.get('origin');
        if (!origin) return true;
        return allowedOrigins.includes(origin.replace(/\/+$/, ''));
      },
      credentials: true,
    }),
  )
  .use(
    process.env.NODE_ENV === 'production'
      ? new Elysia({ name: 'no-openapi' })
      : openapi({
          documentation: {
            info: { title: 'IT.FORUM API', version: '1.0.0', description: 'Elysia + Drizzle backend.' },
          },
        }),
  )
  .use(
    // Serve uploaded files statically, with CORP so the frontend (other origin) can load images.
    await staticPlugin({
      assets: uploadsDir,
      prefix: '/uploads',
      // Resolve files on-demand (like express.static): serves files uploaded at runtime and
      // avoids pre-scanning the dir at boot (default in production), which would crash if empty.
      alwaysStatic: false,
      headers: { 'cross-origin-resource-policy': 'cross-origin' },
    }),
  )
  // Central error handler — preserves the `{ error: "..." }` contract the frontend expects.
  .onError(({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return { error: error.message };
    }
    if (code === 'VALIDATION') {
      set.status = 400;
      const body: { error: string; details?: unknown } = { error: 'Validation Error' };
      if (process.env.NODE_ENV !== 'production') body.details = error.all;
      return body;
    }
    if (code === 'INVALID_FILE_TYPE') {
      set.status = 400;
      return { error: error.message || 'Invalid file type' };
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { error: 'Resource not found' };
    }
    logger.error('Unhandled error', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
    });
    set.status = 500;
    return { error: 'Internal Server Error' };
  })
  // Global rate limiter (generous; skips /uploads and /openapi).
  .use(globalRateLimit)
  .get('/health', () => ({ status: 'ok' }))
  .get('/', () => 'IT.FORUM — Elysia + Drizzle backend is running.')
  .use(authRoutes)
  .use(forumRoutes)
  .use(threadRoutes)
  .use(postRoutes)
  .use(userRoutes)
  .use(searchRoutes)
  .use(likeRoutes)
  .use(uploadRoutes)
  .use(attachmentRoutes)
  .use(adminRoutes)
  .use(reportRoutes)
  .use(shareRoutes)
  .use(badgeRoutes)
  .listen(port, () => {
    logger.info(`IT.FORUM Elysia server listening on port ${port}`);
  });
