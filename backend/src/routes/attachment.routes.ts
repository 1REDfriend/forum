import { Elysia, t } from 'elysia';
import { auth } from '../http/auth.js';
import { cdnMultipart } from '../services/cdn-multipart.service.js';

// Keep this in sync with Axite's UPLOAD_MAX_CHUNK_BYTES (95MB) + a little slack.
const MAX_CHUNK_BYTES = 96 * 1024 * 1024;

export const attachmentRoutes = new Elysia({ prefix: '/upload/attachment', tags: ['Upload'] })
  .use(auth)
  .guard({ auth: true }, (app) =>
    app
      .post(
        '/create',
        ({ body }) => cdnMultipart.create(body),
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
            throw new Error('Chunk too large');
          }
          return cdnMultipart.uploadPart({
            objectKey: query.object_key,
            uploadId: query.upload_id,
            partNumber: Number(query.part_number),
            body: buffer,
          });
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
          cdnMultipart.complete({
            objectKey: body.object_key,
            uploadId: body.upload_id,
            parts: body.parts,
          }),
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
          cdnMultipart.abort({ objectKey: body.object_key, uploadId: body.upload_id }),
        { body: t.Object({ object_key: t.String(), upload_id: t.String() }) },
      ),
  );
