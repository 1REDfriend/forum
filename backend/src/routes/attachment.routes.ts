import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { attachmentUploadRepository } from '../repositories/attachmentUpload.repository.js';
import { CdnHttpError, cdnMultipart } from '../services/cdn-multipart.service.js';
import { AppError, BadRequestError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Keep this in sync with Axite's UPLOAD_MAX_CHUNK_BYTES (95MB) + a little slack.
const MAX_CHUNK_BYTES = 96 * 1024 * 1024;

const CreateAttachmentDTO = z.object({
  filename: z.string().min(1).max(512),
  mime: z.string().max(255),
  size: z.coerce.number().min(1),
});

const PartQuery = z.object({
  object_key: z.string(),
  upload_id: z.string(),
  part_number: z.string(),
});

const CompleteDTO = z.object({
  object_key: z.string(),
  upload_id: z.string(),
  parts: z
    .array(z.object({ part_number: z.coerce.number(), etag: z.string() }))
    .min(1),
});

const AbortDTO = z.object({ object_key: z.string(), upload_id: z.string() });

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

export const attachmentRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post('/create', validate('json', CreateAttachmentDTO), async (c) => {
    const result = await bridgeCdnErrors(() => cdnMultipart.create(c.req.valid('json')));
    await attachmentUploadRepository.record({
      uploadId: result.upload_id,
      objectKey: result.object_key,
      userId: c.get('user').userId,
    });
    return c.json(result);
  })
  .put('/part', validate('query', PartQuery), async (c) => {
    const query = c.req.valid('query');
    const owned = await attachmentUploadRepository.isOwnedBy({
      uploadId: query.upload_id,
      objectKey: query.object_key,
      userId: c.get('user').userId,
    });
    if (!owned) throw ForbiddenError('Upload not found');

    const body = await c.req.parseBody();
    const chunk = body['chunk'];
    if (!(chunk instanceof File)) return c.json({ error: 'Validation Error' }, 400);

    const buffer = Buffer.from(await chunk.arrayBuffer());
    if (buffer.length > MAX_CHUNK_BYTES) {
      throw BadRequestError('Chunk too large');
    }
    return c.json(
      await bridgeCdnErrors(() =>
        cdnMultipart.uploadPart({
          objectKey: query.object_key,
          uploadId: query.upload_id,
          partNumber: Number(query.part_number),
          body: buffer,
        }),
      ),
    );
  })
  .post('/complete', validate('json', CompleteDTO), async (c) => {
    const body = c.req.valid('json');
    const owned = await attachmentUploadRepository.isOwnedBy({
      uploadId: body.upload_id,
      objectKey: body.object_key,
      userId: c.get('user').userId,
    });
    if (!owned) throw ForbiddenError('Upload not found');

    const result = await bridgeCdnErrors(() =>
      cdnMultipart.complete({
        objectKey: body.object_key,
        uploadId: body.upload_id,
        parts: body.parts,
      }),
    );
    await attachmentUploadRepository.deleteByUploadId(body.upload_id);
    return c.json(result);
  })
  .post('/abort', validate('json', AbortDTO), async (c) => {
    const body = c.req.valid('json');
    const owned = await attachmentUploadRepository.isOwnedBy({
      uploadId: body.upload_id,
      objectKey: body.object_key,
      userId: c.get('user').userId,
    });
    if (!owned) throw ForbiddenError('Upload not found');

    const result = await bridgeCdnErrors(() =>
      cdnMultipart.abort({ objectKey: body.object_key, uploadId: body.upload_id }),
    );
    await attachmentUploadRepository.deleteByUploadId(body.upload_id);
    return c.json(result);
  });
