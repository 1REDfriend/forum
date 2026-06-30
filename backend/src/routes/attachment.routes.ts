import { Elysia, t } from 'elysia';
import { auth } from '../http/auth.js';
import { CdnHttpError, cdnMultipart } from '../services/cdn-multipart.service.js';
import { AppError, BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Keep this in sync with Axite's UPLOAD_MAX_CHUNK_BYTES (95MB) + a little slack.
const MAX_CHUNK_BYTES = 96 * 1024 * 1024;

/**
 * Map a CdnHttpError's real upstream status to a forum-facing one: pass
 * through 4xx as-is (the CDN's quota/rate-limit/not-found signal is still
 * meaningful to a client), collapse any CDN-side 5xx to 502 so an Axite
 * outage isn't reported as if it were the forum backend's own bug.
 *
 * 4xx messages are passed through (intentionally client-facing strings like
 * "quota exceeded"); 5xx messages are NOT — they may embed up to 300 raw
 * characters of Axite's own error body (internal hostnames, driver errors),
 * so the client gets a generic message while the real one is logged
 * server-side (the global error handler only logs non-AppError throws, and
 * this function converts CdnHttpError to AppError, so it would otherwise
 * go unlogged).
 */
async function bridgeCdnErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof CdnHttpError) {
      const isClientError = err.status >= 400 && err.status < 500;
      if (!isClientError) logger.error('CDN multipart upload failed', { error: err.message, status: err.status });
      throw new AppError(
        isClientError ? err.status : 502,
        isClientError ? err.message : 'Upload service temporarily unavailable',
      );
    }
    throw err;
  }
}

export const attachmentRoutes = new Elysia({ prefix: '/upload/attachment', tags: ['Upload'] })
  .use(auth)
  .guard({ auth: true }, (app) =>
    app
      .post(
        '/create',
        ({ body }) => bridgeCdnErrors(() => cdnMultipart.create(body)),
        {
          body: t.Object({
            filename: t.String({ minLength: 1, maxLength: 512 }),
            mime: t.String({ maxLength: 255 }),
            size: t.Numeric({ minimum: 1 }),
          }),
        },
      )
      .put(
        '/part',
        async ({ query, body }) => {
          const buffer = Buffer.from(await body.chunk.arrayBuffer());
          if (buffer.length > MAX_CHUNK_BYTES) {
            throw BadRequestError('Chunk too large');
          }
          return bridgeCdnErrors(() =>
            cdnMultipart.uploadPart({
              objectKey: query.object_key,
              uploadId: query.upload_id,
              partNumber: Number(query.part_number),
              body: buffer,
            }),
          );
        },
        {
          query: t.Object({
            object_key: t.String(),
            upload_id: t.String(),
            part_number: t.String(),
          }),
          body: t.Object({ chunk: t.File({ maxSize: '96m' }) }),
        },
      )
      .post(
        '/complete',
        ({ body }) =>
          bridgeCdnErrors(() =>
            cdnMultipart.complete({
              objectKey: body.object_key,
              uploadId: body.upload_id,
              parts: body.parts,
            }),
          ),
        {
          body: t.Object({
            object_key: t.String(),
            upload_id: t.String(),
            parts: t.Array(
              t.Object({ part_number: t.Numeric(), etag: t.String() }),
              { minItems: 1 },
            ),
          }),
        },
      )
      .post(
        '/abort',
        ({ body }) =>
          bridgeCdnErrors(() =>
            cdnMultipart.abort({ objectKey: body.object_key, uploadId: body.upload_id }),
          ),
        { body: t.Object({ object_key: t.String(), upload_id: t.String() }) },
      ),
  );
