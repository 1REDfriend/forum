# Thread Attachments via Chunked CDN Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users paste/drop/pick **any file type up to 10 GB** in the Markdown editor; the file uploads to the Axite CDN in <100 MB chunks (under Cloudflare's body cap) and is inserted as a Markdown link `[filename](url)`.

**Architecture:** Browser slices the file into 90 MB chunks. The forum backend brokers a 4-call multipart flow (create → part×N → complete → abort) to Axite, attaching the CDN API key server-side. Axite assembles the chunks with native S3 multipart upload into MinIO. Each individual request stays under the Cloudflare 100 MB proxy cap, so no infrastructure change is needed.

**Tech Stack:** Axite = Elysia + Bun + `@aws-sdk/client-s3` (new) + MinIO. Forum backend = Elysia + Bun. Frontend = Vue 3 + Vite + `marked`. Reference spec: `docs/superpowers/specs/2026-06-30-thread-attachments-chunked-cdn-design.md`.

---

## File Structure

**Axite CDN (`~/github/cdn-axite`, edited on the Radxa box):**
- `app/package.json` — add `@aws-sdk/client-s3`.
- `app/src/services/storage.service.ts` — add S3 multipart methods (create/uploadPart/complete/abort) via a second S3 client; keep the existing `minio` client for everything else.
- `app/src/config.ts` — raise `upload.maxFileBytes` to 10 GB, add `upload.maxChunkBytes`, add `upload.inlineSafeMime`.
- `app/src/plugins/multipart-upload.plugin.ts` — **new** — the 4 multipart endpoints under `/v1/upload/multipart`.
- `app/src/plugins/asset.plugin.ts` — force `Content-Disposition: attachment` + `nosniff` for non-inline-safe mime on `GET /files/*`.
- `app/src/plugins/upload.plugin.ts` — accept any mime (drop the allowlist gate) for the legacy small path too.
- `app/src/index.ts` — register the new plugin.

**Forum backend (`backend/`):**
- `backend/src/domain/attachment.ts` — **new** — pure helpers (mime classification, chunk math) — unit tested.
- `backend/src/services/cdn-multipart.service.ts` — **new** — typed broker calls to Axite's multipart API.
- `backend/src/routes/attachment.routes.ts` — **new** — `/upload/attachment/*` broker routes (auth).
- `backend/src/index.ts` — register the route.

**Forum frontend (`frontend/`):**
- `frontend/src/api/upload-chunked.ts` — **new** — browser-side chunk orchestrator — unit tested for chunk math.
- `frontend/src/api/likes.ts` — add `UploadApi.uploadAttachment(...)`.
- `frontend/src/components/MarkdownEditor.vue` — generalise paste/drop/pick to any file; progress + cancel UI.

---

# PHASE 1 — Axite CDN multipart endpoints

> All Phase 1 edits happen on the Radxa box (`~/github/cdn-axite`). Use the `radxa` skill (plink). Ask permission before each remote command per the skill. There is no unit-test runner in cdn-axite; verification is `bun run typecheck` + curl e2e. Commit on the box; the repo is also pushed to its own remote by the user.

### Task 1: Add the S3 SDK and multipart storage methods

**Files:**
- Modify: `app/package.json`
- Modify: `app/src/services/storage.service.ts`

- [ ] **Step 1: Install the AWS S3 SDK on the box**

Run (on Radxa, in `~/github/cdn-axite/app`):
```bash
bun add @aws-sdk/client-s3
```
Expected: `installed @aws-sdk/client-s3` and `package.json` lists it under `dependencies`.

- [ ] **Step 2: Add an S3 client + multipart methods to the storage service**

In `app/src/services/storage.service.ts`, add the import at the top:
```ts
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
```

Inside `class StorageService`, add a second client field and build it in the constructor (MinIO is S3-compatible; reuse the same creds):
```ts
  private s3: S3Client;
```
In the constructor, after `this.bucket = config.storage.bucket;`:
```ts
    this.s3 = new S3Client({
      endpoint: `${config.storage.useSSL ? "https" : "http"}://${config.storage.endpoint}:${config.storage.port}`,
      region: config.storage.region,
      forcePathStyle: true, // MinIO requires path-style addressing
      credentials: {
        accessKeyId: config.storage.accessKey,
        secretAccessKey: config.storage.secretKey,
      },
    });
```

Add these methods to the class (after `presignedGet`):
```ts
  /** Begin a multipart upload; returns the S3 uploadId. */
  async createMultipart(
    objectKey: string,
    contentType: string,
    metadata: Record<string, string> = {},
  ): Promise<string> {
    const out = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: contentType,
        Metadata: metadata,
      }),
    );
    if (!out.UploadId) throw new Error("S3 did not return an UploadId");
    return out.UploadId;
  }

  /** Upload one part (1-based partNumber). Returns its ETag. */
  async uploadPart(
    objectKey: string,
    uploadId: string,
    partNumber: number,
    body: Buffer,
  ): Promise<string> {
    const out = await this.s3.send(
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: objectKey,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
      }),
    );
    if (!out.ETag) throw new Error("S3 did not return an ETag for the part");
    return out.ETag;
  }

  /** Complete the upload by stitching the parts in order. */
  async completeMultipart(
    objectKey: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[],
  ): Promise<void> {
    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: objectKey,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts
            .slice()
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
        },
      }),
    );
  }

  /** Abort an in-progress upload and discard its parts. */
  async abortMultipart(objectKey: string, uploadId: string): Promise<void> {
    await this.s3.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: objectKey,
        UploadId: uploadId,
      }),
    );
  }
```

- [ ] **Step 3: Typecheck**

Run (on Radxa, `~/github/cdn-axite/app`): `bun run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/bun.lockb app/src/services/storage.service.ts
git commit -m "feat(storage): S3 multipart upload methods (create/part/complete/abort)"
```

---

### Task 2: Config — raise limits and add chunk / inline-safe settings

**Files:**
- Modify: `app/src/config.ts`

- [ ] **Step 1: Update the `upload` config block**

In `app/src/config.ts`, the `upload` block currently has `maxFileBytes` and `allowedMime`. Change/extend it to:
```ts
    maxFileBytes: envInt("UPLOAD_MAX_BYTES", 10 * 1024 * 1024 * 1024), // 10 GB
    /** Max bytes per multipart chunk — must stay under the Cloudflare body cap. */
    maxChunkBytes: envInt("UPLOAD_MAX_CHUNK_BYTES", 95 * 1024 * 1024), // 95 MB
    /** Mime types safe to serve inline; everything else is forced to download. */
    inlineSafeMime: env(
      "UPLOAD_INLINE_SAFE_MIME",
      "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,application/pdf",
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
```
Keep `allowedMime` as-is for now (Task 5 stops enforcing it).

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no errors. (`maxChunkBytes` / `inlineSafeMime` are referenced in later tasks.)

- [ ] **Step 3: Commit**

```bash
git add app/src/config.ts
git commit -m "feat(config): 10GB max file, per-chunk cap, inline-safe mime list"
```

---

### Task 3: Multipart upload plugin (the 4 endpoints)

**Files:**
- Create: `app/src/plugins/multipart-upload.plugin.ts`
- Modify: `app/src/index.ts`

**Contract** (forum broker and browser both depend on this exact shape):
- `POST /v1/upload/multipart/create` — JSON `{ filename, mime, size }` → `{ upload_id, object_key }`
- `PUT  /v1/upload/multipart/part` — query `?object_key=&upload_id=&part_number=`, body = raw chunk bytes → `{ part_number, etag }`
- `POST /v1/upload/multipart/complete` — JSON `{ object_key, upload_id, parts: [{ part_number, etag }] }` → `{ id, object_key, url, size_bytes, mime_type }`
- `POST /v1/upload/multipart/abort` — JSON `{ object_key, upload_id }` → `{ ok: true }`

Security: every endpoint that takes `object_key` must verify it begins with `${tenant.id}/` to block cross-tenant tampering.

- [ ] **Step 1: Create the plugin**

Create `app/src/plugins/multipart-upload.plugin.ts`:
```ts
/**
 * Multipart upload plugin — chunked uploads that stay under the Cloudflare
 * body cap. The client slices the file; each part is a separate request that
 * we forward into one S3 multipart upload against MinIO.
 *
 *   POST /v1/upload/multipart/create    → { upload_id, object_key }
 *   PUT  /v1/upload/multipart/part       (raw body) → { part_number, etag }
 *   POST /v1/upload/multipart/complete  → asset record (same shape as /v1/upload)
 *   POST /v1/upload/multipart/abort     → { ok: true }
 */
import { sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { randomUUID } from "node:crypto";

import { config } from "../config.ts";
import { db } from "../db/index.ts";
import { assets, tenants } from "../db/schema.ts";
import {
  ForbiddenError,
  QuotaExceededError,
  TooManyRequestsError,
  ValidationError,
} from "../lib/errors.ts";
import { metrics } from "../metrics/prometheus.plugin.ts";
import { cacheService } from "../services/cache.service.ts";
import { storageService } from "../services/storage.service.ts";
import { requireAuth } from "./auth.plugin.ts";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
};

function extensionFor(fileName: string, mime: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot !== -1 && dot < fileName.length - 1) {
    return fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  return MIME_EXT[mime] ?? "bin";
}

export const multipartUploadPlugin = new Elysia({
  name: "multipart-upload",
  prefix: "/v1/upload/multipart",
})
  .use(requireAuth)
  // ── create ────────────────────────────────────────────────────────────────
  .post(
    "/create",
    async ({ tenant, body, set }) => {
      const rl = await cacheService.rateLimit(`upload:${tenant.id}`, 60, 60);
      if (!rl.allowed) throw new TooManyRequestsError("Upload rate limit exceeded");

      const { filename, mime, size } = body;
      if (size <= 0) throw new ValidationError("Empty file");
      if (size > config.upload.maxFileBytes) {
        throw new ValidationError(
          `File exceeds max size of ${config.upload.maxFileBytes} bytes`,
        );
      }
      if (tenant.usedBytes + BigInt(size) > tenant.quotaBytes) {
        throw new QuotaExceededError("Upload would exceed quota");
      }

      const contentType = mime || "application/octet-stream";
      const objectKey = `${tenant.id}/${randomUUID()}.${extensionFor(filename, contentType)}`;
      const uploadId = await storageService.createMultipart(objectKey, contentType, {
        "x-amz-meta-tenant": tenant.id,
        "x-amz-meta-original-name": encodeURIComponent(filename),
      });

      set.status = 201;
      return { upload_id: uploadId, object_key: objectKey };
    },
    {
      body: t.Object({
        filename: t.String({ minLength: 1, maxLength: 512 }),
        mime: t.String({ maxLength: 255 }),
        size: t.Numeric({ minimum: 1 }),
      }),
      detail: { summary: "Begin a chunked upload", tags: ["assets"] },
    },
  )
  // ── part ──────────────────────────────────────────────────────────────────
  .put(
    "/part",
    async ({ tenant, query, request }) => {
      const objectKey = query.object_key;
      const uploadId = query.upload_id;
      const partNumber = Number(query.part_number);

      if (!objectKey.startsWith(`${tenant.id}/`)) {
        throw new ForbiddenError("object_key does not belong to this tenant");
      }
      if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
        throw new ValidationError("part_number must be 1..10000");
      }

      const buf = Buffer.from(await request.arrayBuffer());
      if (buf.length === 0) throw new ValidationError("Empty chunk");
      if (buf.length > config.upload.maxChunkBytes) {
        throw new ValidationError(
          `Chunk exceeds max of ${config.upload.maxChunkBytes} bytes`,
        );
      }

      const etag = await storageService.uploadPart(objectKey, uploadId, partNumber, buf);
      return { part_number: partNumber, etag };
    },
    {
      query: t.Object({
        object_key: t.String(),
        upload_id: t.String(),
        part_number: t.String(),
      }),
      // Accept any binary body; Elysia must not try to JSON-parse it.
      type: "arrayBuffer",
      detail: { summary: "Upload one chunk", tags: ["assets"] },
    },
  )
  // ── complete ───────────────────────────────────────────────────────────────
  .post(
    "/complete",
    async ({ tenant, body, set }) => {
      const { object_key: objectKey, upload_id: uploadId, parts } = body;
      if (!objectKey.startsWith(`${tenant.id}/`)) {
        throw new ForbiddenError("object_key does not belong to this tenant");
      }
      if (parts.length === 0) throw new ValidationError("No parts to complete");

      await storageService.completeMultipart(
        objectKey,
        uploadId,
        parts.map((p) => ({ partNumber: p.part_number, etag: p.etag })),
      );

      // Authoritative size + mime from the stored object.
      const statInfo = await storageService.stat(objectKey);
      const originalName = decodeURIComponent(
        statInfo.metaData["original-name"] ??
          statInfo.metaData["x-amz-meta-original-name"] ??
          objectKey.split("/").pop()!,
      );

      const [asset] = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(assets)
          .values({
            tenantId: tenant.id,
            objectKey,
            originalName,
            mimeType: statInfo.contentType,
            sizeBytes: BigInt(statInfo.size),
            storageBucket: storageService.bucket,
            metadata: {},
            status: "active",
          })
          .returning();
        await tx
          .update(tenants)
          .set({ usedBytes: sql`${tenants.usedBytes} + ${statInfo.size}` })
          .where(sql`${tenants.id} = ${tenant.id}`);
        return inserted;
      });

      metrics.uploadBytesTotal.inc(statInfo.size);
      await cacheService.del(`tenant:${tenant.id}`);

      set.status = 201;
      return {
        id: asset!.id,
        object_key: asset!.objectKey,
        original_name: asset!.originalName,
        mime_type: asset!.mimeType,
        size_bytes: Number(asset!.sizeBytes),
        url: `${config.server.publicUrl.replace(/\/$/, "")}/files/${objectKey}`,
        status: asset!.status,
        created_at: asset!.createdAt,
      };
    },
    {
      body: t.Object({
        object_key: t.String(),
        upload_id: t.String(),
        parts: t.Array(
          t.Object({ part_number: t.Numeric(), etag: t.String() }),
          { minItems: 1 },
        ),
      }),
      detail: { summary: "Complete a chunked upload", tags: ["assets"] },
    },
  )
  // ── abort ──────────────────────────────────────────────────────────────────
  .post(
    "/abort",
    async ({ tenant, body }) => {
      const { object_key: objectKey, upload_id: uploadId } = body;
      if (!objectKey.startsWith(`${tenant.id}/`)) {
        throw new ForbiddenError("object_key does not belong to this tenant");
      }
      await storageService.abortMultipart(objectKey, uploadId);
      return { ok: true };
    },
    {
      body: t.Object({ object_key: t.String(), upload_id: t.String() }),
      detail: { summary: "Abort a chunked upload", tags: ["assets"] },
    },
  );
```

> NOTE during implementation: confirm Elysia v1's body type token for a raw binary body. The intent is "do not parse the body; give me the bytes." If `type: "arrayBuffer"` is not accepted by this Elysia version, read the raw bytes via `request.arrayBuffer()` and omit the `type`/`query` schema coercion accordingly. Verify against `@elysiajs` version in `app/package.json` before finalizing.

- [ ] **Step 2: Register the plugin**

In `app/src/index.ts`, add the import alongside the other plugin imports:
```ts
import { multipartUploadPlugin } from "./plugins/multipart-upload.plugin.ts";
```
And add `.use(multipartUploadPlugin)` in the chain, immediately after `.use(uploadPlugin)`:
```ts
  .use(uploadPlugin)
  .use(multipartUploadPlugin)
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/plugins/multipart-upload.plugin.ts app/src/index.ts
git commit -m "feat(upload): chunked multipart endpoints under /v1/upload/multipart"
```

---

### Task 4: Harden the public serve path (`GET /files/*`)

**Files:**
- Modify: `app/src/plugins/asset.plugin.ts`

Security-critical: arbitrary uploaded HTML/SVG/JS must never be served inline from the CDN origin.

- [ ] **Step 1: Force download for non-inline-safe mime**

In `app/src/plugins/asset.plugin.ts`, find where the response headers are set for the served object (around the `set.headers["content-type"] = contentType` lines, ~85 and ~101). For the path that streams the original asset, replace the content-type assignment so that when the asset mime is **not** in `config.upload.inlineSafeMime` the file is sent as an attachment with no-sniff. Add this import at the top:
```ts
import { config } from "../config.ts";
```
Then where the object is served, after computing `contentType` and having the asset's `originalName` available, set:
```ts
      const inlineSafe = config.upload.inlineSafeMime.includes(contentType);
      set.headers["content-type"] = inlineSafe ? contentType : "application/octet-stream";
      set.headers["x-content-type-options"] = "nosniff";
      if (!inlineSafe) {
        set.headers["content-disposition"] =
          `attachment; filename="${encodeURIComponent(originalName)}"`;
      }
```
If `originalName` is not already loaded in this handler, fetch it from the `assets` row (the handler already queries the asset for `mimeType`; add `originalName` to that select). Apply the same treatment to the transform/variant branch only if it can serve non-image types — image transforms are always inline-safe, so leave those.

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/plugins/asset.plugin.ts
git commit -m "fix(asset): force attachment+nosniff for non-inline-safe mime types"
```

---

### Task 5: Accept any mime on the legacy upload path

**Files:**
- Modify: `app/src/plugins/upload.plugin.ts`

- [ ] **Step 1: Drop the allowlist rejection**

In `app/src/plugins/upload.plugin.ts`, remove the block:
```ts
      if (!config.upload.allowedMime.includes(mime)) {
        throw new ValidationError(`Unsupported mime type: ${mime}`);
      }
```
The size + quota checks remain. (Safety now comes from the serve-path hardening in Task 4, not from blocking types.)

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/plugins/upload.plugin.ts
git commit -m "feat(upload): accept any mime type (download enforced at serve path)"
```

---

### Task 6: Deploy Axite + end-to-end verification

**Files:** none (deploy + verify)

- [ ] **Step 1: Restart the Axite container with the new code**

On Radxa: rebuild/restart the `axite-elysia` service per the cdn-axite deploy method (e.g. `docker compose up -d --build elysia` from `~/github/cdn-axite`). Confirm it is healthy: `docker compose logs --tail=50 elysia` shows it listening with no startup error.

- [ ] **Step 2: Verify a >100 MB chunked upload succeeds end-to-end through Cloudflare**

This is the proof the Cloudflare cap is bypassed. From the dev machine, run a small script that creates a ~250 MB file, slices it into 95 MB chunks, and drives the 4-call flow against `https://cdn.supakorn.xyz` with the CDN bearer key:
```bash
# pseudocode the implementer fills in with curl or a bun script:
# 1) POST /v1/upload/multipart/create  {filename:"big.bin",mime:"application/octet-stream",size:262144000}
#    -> capture upload_id, object_key
# 2) for each 95MB slice i (part_number = i+1):
#    PUT  /v1/upload/multipart/part?object_key=..&upload_id=..&part_number=N  --data-binary @sliceN
#    -> capture {part_number, etag}
# 3) POST /v1/upload/multipart/complete {object_key,upload_id,parts:[...]}
#    -> capture url
# 4) GET the url -> 200, Content-Disposition: attachment, full size_bytes match
```
Expected: complete returns a `https://cdn.supakorn.xyz/files/...` URL; `curl -I` on it returns `200`, `content-disposition: attachment`, and `content-length` ≈ 250 MB. No `413` at any step.

- [ ] **Step 3: Verify the security control**

`curl -sI` the uploaded non-image URL. Expected headers: `content-type: application/octet-stream`, `content-disposition: attachment; filename="big.bin"`, `x-content-type-options: nosniff`.

- [ ] **Step 4: Configure orphaned-multipart cleanup (operational)**

Add an S3 lifecycle rule on the bucket to abort incomplete multipart uploads after 24h (via `mc ilm` against MinIO, or document it for the user to apply). Record what was applied in the deploy notes.

---

# PHASE 2 — Forum backend broker

> Back in the `forum` repo (this working directory). `bun test` is the runner.

### Task 7: Pure attachment helpers (TDD)

**Files:**
- Create: `backend/src/domain/attachment.ts`
- Test: `backend/src/domain/attachment.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/domain/attachment.test.ts`:
```ts
import { describe, expect, it } from 'bun:test';
import { isInlineImageMime, attachmentMarkdown } from './attachment.js';

describe('isInlineImageMime', () => {
  it('is true for images', () => {
    expect(isInlineImageMime('image/png')).toBe(true);
    expect(isInlineImageMime('image/jpeg')).toBe(true);
  });
  it('is false for everything else', () => {
    expect(isInlineImageMime('application/zip')).toBe(false);
    expect(isInlineImageMime('video/mp4')).toBe(false);
    expect(isInlineImageMime('')).toBe(false);
  });
});

describe('attachmentMarkdown', () => {
  it('renders a link for a normal filename', () => {
    expect(attachmentMarkdown('report.zip', 'https://cdn/x.zip'))
      .toBe('[report.zip](https://cdn/x.zip)');
  });
  it('escapes ] and ( ) in the filename label', () => {
    expect(attachmentMarkdown('a]b(c).zip', 'https://cdn/x.zip'))
      .toBe('[a\\]b(c).zip](https://cdn/x.zip)');
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `bun test backend/src/domain/attachment.test.ts`
Expected: FAIL — `Cannot find module './attachment.js'`.

- [ ] **Step 3: Implement**

Create `backend/src/domain/attachment.ts`:
```ts
/** Mime types the editor inserts as inline images (`![]()`) rather than links. */
const INLINE_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
]);

export const isInlineImageMime = (mime: string): boolean =>
  INLINE_IMAGE_MIME.has(mime);

/** Build a Markdown link, escaping `]` so the label can't break out. */
export const attachmentMarkdown = (filename: string, url: string): string => {
  const label = filename.replace(/]/g, '\\]');
  return `[${label}](${url})`;
};
```

- [ ] **Step 4: Run it; verify it passes**

Run: `bun test backend/src/domain/attachment.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/attachment.ts backend/src/domain/attachment.test.ts
git commit -m "feat(attachment): pure helpers for mime class + markdown link"
```

---

### Task 8: CDN multipart broker service

**Files:**
- Create: `backend/src/services/cdn-multipart.service.ts`

This forwards to Axite's `/v1/upload/multipart/*` with the server-side bearer key. It reuses the same `CDN_BASE_URL` / `CDN_API_KEY` env the existing `storage.service.ts` cdn driver uses.

- [ ] **Step 1: Implement the broker**

Create `backend/src/services/cdn-multipart.service.ts`:
```ts
/**
 * Broker to Axite's chunked-upload API. The CDN key stays here, server-side;
 * the browser only ever talks to the forum backend. Each part is bounded
 * (≤ the chunk size the client uses), so memory stays flat even for a 10GB file.
 */
const baseUrl = () => {
  const url = process.env.CDN_BASE_URL;
  if (!url) throw new Error('CDN_BASE_URL is not configured');
  return url.replace(/\/$/, '');
};

const authHeader = () => {
  const key = process.env.CDN_API_KEY;
  if (!key) throw new Error('CDN_API_KEY is not configured');
  return `Bearer ${key}`;
};

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`CDN multipart error (HTTP ${res.status}): ${detail.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export interface CreateResult { upload_id: string; object_key: string; }
export interface PartResult { part_number: number; etag: string; }
export interface CompleteResult {
  id: string; url: string; size_bytes: number; mime_type: string; original_name: string;
}

export const cdnMultipart = {
  create(input: { filename: string; mime: string; size: number }): Promise<CreateResult> {
    return fetch(`${baseUrl()}/v1/upload/multipart/create`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((r) => asJson<CreateResult>(r));
  },

  uploadPart(input: {
    objectKey: string; uploadId: string; partNumber: number; body: Buffer;
  }): Promise<PartResult> {
    const qs = new URLSearchParams({
      object_key: input.objectKey,
      upload_id: input.uploadId,
      part_number: String(input.partNumber),
    });
    return fetch(`${baseUrl()}/v1/upload/multipart/part?${qs}`, {
      method: 'PUT',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/octet-stream' },
      body: input.body,
    }).then((r) => asJson<PartResult>(r));
  },

  complete(input: {
    objectKey: string; uploadId: string; parts: PartResult[];
  }): Promise<CompleteResult> {
    return fetch(`${baseUrl()}/v1/upload/multipart/complete`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object_key: input.objectKey,
        upload_id: input.uploadId,
        parts: input.parts,
      }),
    }).then((r) => asJson<CompleteResult>(r));
  },

  abort(input: { objectKey: string; uploadId: string }): Promise<{ ok: boolean }> {
    return fetch(`${baseUrl()}/v1/upload/multipart/abort`, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ object_key: input.objectKey, upload_id: input.uploadId }),
    }).then((r) => asJson<{ ok: boolean }>(r));
  },
};
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && bunx tsc --noEmit` (or the repo's typecheck script if present).
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/cdn-multipart.service.ts
git commit -m "feat(cdn): server-side broker for Axite chunked upload"
```

---

### Task 9: Attachment broker routes (auth-gated)

**Files:**
- Create: `backend/src/routes/attachment.routes.ts`
- Modify: `backend/src/index.ts`

Mirror the Axite contract, gated on `auth: true` (logged-in users only), matching the existing upload routes' style (`backend/src/routes/upload.routes.ts`).

- [ ] **Step 1: Create the routes**

Create `backend/src/routes/attachment.routes.ts`:
```ts
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
```

> The browser sends each chunk as multipart field `chunk` (a `File`/`Blob`) so it rides the existing auth/multipart handling; the broker unwraps it to a Buffer and forwards as raw bytes to Axite.

- [ ] **Step 2: Register the route**

In `backend/src/index.ts`, import and `.use(...)` it next to where `uploadRoutes` is registered:
```ts
import { attachmentRoutes } from './routes/attachment.routes.js';
// ...
  .use(attachmentRoutes)
```
(Match the exact registration style used for `uploadRoutes` in that file.)

- [ ] **Step 3: Typecheck + start the server**

Run: `cd backend && bun run dev` (or the repo's start script). Expected: starts with no error; `GET /swagger` (if enabled) lists `/upload/attachment/*`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/attachment.routes.ts backend/src/index.ts
git commit -m "feat(upload): /upload/attachment broker routes (auth-gated chunked upload)"
```

---

# PHASE 3 — Editor (frontend)

> `frontend/` uses Vue 3 + Vite + Vitest (see `*.test.ts`). Verify with the preview tools.

### Task 10: Browser chunk orchestrator (TDD for chunk math)

**Files:**
- Create: `frontend/src/api/upload-chunked.ts`
- Test: `frontend/src/api/upload-chunked.test.ts`

- [ ] **Step 1: Write the failing test (pure chunk math)**

Create `frontend/src/api/upload-chunked.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { planChunks } from './upload-chunked';

describe('planChunks', () => {
  it('splits into ceil(size/chunk) ranges', () => {
    const ranges = planChunks(250, 100);
    expect(ranges).toEqual([
      { partNumber: 1, start: 0, end: 100 },
      { partNumber: 2, start: 100, end: 200 },
      { partNumber: 3, start: 200, end: 250 },
    ]);
  });
  it('handles an exact multiple', () => {
    expect(planChunks(200, 100)).toEqual([
      { partNumber: 1, start: 0, end: 100 },
      { partNumber: 2, start: 100, end: 200 },
    ]);
  });
  it('handles a file smaller than one chunk', () => {
    expect(planChunks(40, 100)).toEqual([{ partNumber: 1, start: 0, end: 40 }]);
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `cd frontend && bunx vitest run src/api/upload-chunked.test.ts`
Expected: FAIL — `planChunks` not exported.

- [ ] **Step 3: Implement the orchestrator**

Create `frontend/src/api/upload-chunked.ts`:
```ts
import type { ApiClient } from './client.js';

/** ~90 MB — comfortably under Cloudflare's 100 MB body cap. */
export const CHUNK_BYTES = 90 * 1024 * 1024;

export interface ChunkRange { partNumber: number; start: number; end: number; }

/** Pure: split a byte length into ordered, 1-based part ranges. */
export function planChunks(size: number, chunkBytes: number): ChunkRange[] {
  const ranges: ChunkRange[] = [];
  let part = 1;
  for (let start = 0; start < size; start += chunkBytes) {
    ranges.push({ partNumber: part++, start, end: Math.min(start + chunkBytes, size) });
  }
  return ranges;
}

interface CreateResult { upload_id: string; object_key: string; }
interface PartResult { part_number: number; etag: string; }
interface CompleteResult { url: string; size_bytes: number; original_name: string; }

export interface ChunkedUploadHandle {
  promise: Promise<CompleteResult>;
  cancel: () => void;
}

/**
 * Drive create → part×N → complete against the forum broker. Reports byte
 * progress and supports cancel (aborts the multipart upload server-side).
 */
export function uploadInChunks(
  client: ApiClient,
  file: File,
  onProgress: (uploadedBytes: number, totalBytes: number) => void,
): ChunkedUploadHandle {
  let cancelled = false;
  let created: CreateResult | null = null;

  const run = async (): Promise<CompleteResult> => {
    created = await client.post<CreateResult>('/upload/attachment/create', {
      filename: file.name,
      mime: file.type || 'application/octet-stream',
      size: file.size,
    });

    const ranges = planChunks(file.size, CHUNK_BYTES);
    const parts: PartResult[] = [];
    let uploaded = 0;

    for (const r of ranges) {
      if (cancelled) throw new Error('cancelled');
      const blob = file.slice(r.start, r.end);
      const form = new FormData();
      form.append('chunk', blob, `${file.name}.part${r.partNumber}`);
      const qs = new URLSearchParams({
        object_key: created.object_key,
        upload_id: created.upload_id,
        part_number: String(r.partNumber),
      });
      const part = await client.put<PartResult>(`/upload/attachment/part?${qs}`, form);
      parts.push(part);
      uploaded += r.end - r.start;
      onProgress(uploaded, file.size);
    }

    return client.post<CompleteResult>('/upload/attachment/complete', {
      object_key: created.object_key,
      upload_id: created.upload_id,
      parts,
    });
  };

  const promise = run().catch((err) => {
    if (created) {
      // best-effort cleanup; ignore failures
      client
        .post('/upload/attachment/abort', {
          object_key: created.object_key,
          upload_id: created.upload_id,
        })
        .catch(() => {});
    }
    throw err;
  });

  return { promise, cancel: () => { cancelled = true; } };
}
```

> If `ApiClient` does not expose a `put` method, add a thin `put<T>(path, data)` that mirrors `post` with `method: 'PUT'` in `frontend/src/api/client.ts` (the existing `request` already branches on `FormData`). Confirm before implementing this task.

- [ ] **Step 4: Run it; verify it passes**

Run: `cd frontend && bunx vitest run src/api/upload-chunked.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/upload-chunked.ts frontend/src/api/upload-chunked.test.ts
git commit -m "feat(upload): browser chunk orchestrator with progress + cancel"
```

---

### Task 11: UploadApi.uploadAttachment

**Files:**
- Modify: `frontend/src/api/likes.ts`

- [ ] **Step 1: Add the method to UploadApi**

In `frontend/src/api/likes.ts`, inside `class UploadApi`, add (it returns the handle so the editor can show progress and cancel):
```ts
  /**
   * Upload any file as a CDN attachment via the chunked broker.
   * Returns a handle: await `.promise` for the final URL; call `.cancel()` to abort.
   */
  public uploadAttachment(
    file: File,
    onProgress: (uploaded: number, total: number) => void,
  ) {
    // Imported at top: import { uploadInChunks } from './upload-chunked.js';
    return uploadInChunks(this.client, file, onProgress);
  }
```
Add the import at the top of `frontend/src/api/likes.ts`:
```ts
import { uploadInChunks } from './upload-chunked.js';
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && bunx vue-tsc --noEmit` (or the repo's typecheck script).
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/likes.ts
git commit -m "feat(upload): UploadApi.uploadAttachment via chunked broker"
```

---

### Task 12: Wire the editor — any file → link, with progress + cancel

**Files:**
- Modify: `frontend/src/components/MarkdownEditor.vue`

- [ ] **Step 1: Generalise the file handlers**

In `frontend/src/components/MarkdownEditor.vue` `<script setup>`:

1. Add reactive upload state next to the existing refs:
```ts
import { uploadApi } from '../api/index.js';
import { attachmentMarkdown } from '...'; // OR inline the helper below

const attachmentProgress = ref<{ name: string; pct: number } | null>(null);
let activeUpload: { cancel: () => void } | null = null;
```
(There is no shared frontend copy of `attachmentMarkdown`; inline it here:)
```ts
const linkMarkdown = (name: string, url: string) =>
  `[${name.replace(/]/g, '\\]')}](${url})`;
```

2. Add an attachment uploader mirroring `uploadImageFile` but for non-images:
```ts
const uploadAttachmentFile = async (file: File) => {
  if (!authStore.isAuthenticated) {
    uploadError.value = 'You must be logged in to upload files.';
    setTimeout(() => { uploadError.value = ''; }, 4000);
    return;
  }
  uploadError.value = '';

  const placeholder = `[Uploading ${file.name}… 0%]()`;
  const textarea = textareaRef.value;
  const insertPos = textarea?.selectionStart ?? props.modelValue.length;
  const before = props.modelValue.substring(0, insertPos);
  const after = props.modelValue.substring(insertPos);
  let currentToken = placeholder;
  emit('update:modelValue', before + placeholder + after);

  const replaceToken = (next: string) => {
    const whole = before + currentToken + after;
    emit('update:modelValue', whole.replace(currentToken, next));
    currentToken = next;
  };

  attachmentProgress.value = { name: file.name, pct: 0 };
  const handle = uploadApi.uploadAttachment(file, (uploaded, total) => {
    const pct = Math.floor((uploaded / total) * 100);
    attachmentProgress.value = { name: file.name, pct };
    replaceToken(`[Uploading ${file.name}… ${pct}%]()`);
  });
  activeUpload = handle;

  try {
    const result = await handle.promise;
    replaceToken(linkMarkdown(file.name, result.url));
  } catch (err: any) {
    replaceToken(''); // remove placeholder
    if (err?.message !== 'cancelled') {
      uploadError.value = err?.message || 'File upload failed.';
      setTimeout(() => { uploadError.value = ''; }, 5000);
    }
  } finally {
    attachmentProgress.value = null;
    activeUpload = null;
  }
};

const cancelAttachment = () => activeUpload?.cancel();
```

3. Route non-images to it. Change `handlePaste` and `handleDrop` so the image branch stays, and a non-image `file` goes to `uploadAttachmentFile`:
```ts
const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.kind !== 'file') continue;
    event.preventDefault();
    const file = item.getAsFile();
    if (!file) return;
    if (file.type.startsWith('image/')) await uploadImageFile(file);
    else await uploadAttachmentFile(file);
    return;
  }
};

const handleDrop = async (event: DragEvent) => {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  event.preventDefault();
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) await uploadImageFile(file);
    else await uploadAttachmentFile(file);
  }
};
```

4. The toolbar picker: keep the 🖼 image button, and add a 📎 attach button. Add a second hidden input (no `accept`):
```ts
const attachInputRef = ref<HTMLInputElement | null>(null);
const triggerAttachPicker = () => attachInputRef.value?.click();
const handleAttachInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await uploadAttachmentFile(file);
  input.value = '';
};
```

- [ ] **Step 2: Template — add the attach button, hidden input, and progress bar**

In the `<template>`: add a second hidden input next to the existing one:
```html
<input ref="attachInputRef" type="file" style="display: none" @change="handleAttachInputChange" />
```
Add a 📎 button in the toolbar (next to the 🖼 button) calling `triggerAttachPicker()`.
Replace the image-only `upload-overlay` with one that also shows attachment progress + a cancel button:
```html
<div v-if="attachmentProgress" class="upload-overlay">
  <span class="upload-spinner" />
  <span>Uploading {{ attachmentProgress.name }} — {{ attachmentProgress.pct }}%</span>
  <button type="button" class="tab-btn" @click="cancelAttachment">Cancel</button>
</div>
```
Update the editor hint text to mention files: `Paste, drop, or attach any file (up to 10GB) — images embed, others link.`

- [ ] **Step 3: Verify in the preview (no manual asking)**

Start the preview (`preview_start`), open a forum's Create Thread page, and use `preview_*` tools to:
- paste/drop a small `.txt` or `.zip` → editor shows `[name](https://cdn.supakorn.xyz/files/...)`.
- check `preview_console_logs` / `preview_network` for the create/part/complete calls returning 201.
- click the rendered link in Preview tab → file downloads (not rendered inline).
- screenshot the progress state for the record.

Fix any issue by editing source and re-checking. (A true 10 GB run is impractical in preview; rely on the Phase 1 Step 2 e2e for the large-file proof, and a >100 MB file here if bandwidth allows.)

- [ ] **Step 4: Run the frontend unit tests**

Run: `cd frontend && bunx vitest run`
Expected: all green, including `upload-chunked.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/MarkdownEditor.vue
git commit -m "feat(editor): paste/drop/attach any file as a CDN link with progress + cancel"
```

---

## Self-Review notes (coverage map)

- Spec §4.1 (4 multipart endpoints + quota/race + cleanup) → Tasks 1,3,6(Step4).
- Spec §4.2 (serve-path attachment/nosniff) → Task 4, verified Task 6 Step 3 + Task 12 Step 3.
- Spec §4.3 (any mime) → Task 5 (legacy) + Task 3 create (no allowlist).
- Spec §4.4 (raise max bytes + per-chunk cap) → Task 2.
- Spec §4.5 backend broker → Tasks 8,9; frontend editor → Tasks 10,11,12.
- Spec §5 (broker mode) → Tasks 8,9 (key server-side, `auth: true`).
- Spec §6 (validation/limits/security) → object_key tenant check (Task 3), chunk cap (Tasks 2,3,9), auth (Task 9), download enforcement (Task 4).
- Spec §8 DoD items 1-5 → Tasks 6 (Steps 2,3), 9, 12.

**Known follow-ups (not blocking):** quota pre-check race (§4.1) accepted; orphan cleanup is operational (Task 6 Step 4); resumable-across-reload is out of scope (§7).
```
