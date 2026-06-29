# Design: Paste / attach any file (≤10GB) in the thread editor, stored on the Axite CDN

**Date:** 2026-06-30
**Status:** Approved design — ready for implementation plan
**Scope:** Forum (`forum` repo) + Axite CDN (`cdn-axite` repo)

## 1. Goal

Let users paste from clipboard, drag-drop, or pick **any file type** (not just images) in the
Markdown editor used by "Create New Thread" (and replies — the editor is shared). Files up to
**10 GB each** upload to the Axite CDN and appear in the post as a Markdown link
(`[filename](url)`); images keep their existing inline `![alt](url)` behaviour.

## 2. The core constraint and why the design looks the way it does

Two hard limits shape everything:

1. **Cloudflare body cap.** `cdn.supakorn.xyz`, `forum-api.supakorn.xyz`, and `forum.supakorn.xyz`
   are all served through a Cloudflare Tunnel. Cloudflare's proxy enforces a request-body limit per
   plan (Free/Pro 100 MB, Business 200 MB, Enterprise ≤500 MB). **Verified empirically 2026-06-30:**
   a 150 MB `POST /v1/upload` returned `HTTP 413 Payload Too Large` from Cloudflare (cut off at
   ~1.3 MB, 0.15 s) before reaching the origin. There is **no plan tier that allows 10 GB** through
   the proxy.
2. **S3 single-PUT limit.** A single S3/MinIO `PutObject` is capped at 5 GB. 10 GB inherently
   requires **multipart upload**.

The design defeats both by **slicing the file in the browser into chunks smaller than the
Cloudflare cap** (default 90 MB) and sending each chunk as its own request. Every individual
request stays under the edge limit, so no Cloudflare plan change, no port-forward, and no public
exposure of MinIO is needed. Axite assembles the chunks into one object using S3 multipart upload.

This is the decisive trade-off: more orchestration code in exchange for zero infrastructure /
networking changes. A 10 GB file becomes ~110 sequential requests through the existing tunnel.

## 3. Current state (verified, not assumed)

**Forum**
- `backend/src/routes/upload.routes.ts` — `POST /upload/image` (10 MB) and `/upload/avatar` (5 MB).
  Both do `Buffer.from(await file.arrayBuffer())` (whole file into RAM) and restrict to an image
  MIME whitelist.
- `backend/src/services/storage.service.ts` — `safeExt()` sniffs image magic bytes and **rejects
  anything that is not JPEG/PNG/GIF/WebP**. The `cdn` driver forwards a single multipart
  `POST {CDN_BASE_URL}/v1/upload` with `Authorization: Bearer {CDN_API_KEY}`. In production
  `CDN_BASE_URL=http://axite-elysia:3000` (internal docker network, bypasses Cloudflare).
- `frontend/src/components/MarkdownEditor.vue` — `handlePaste` / `handleDrop` / toolbar picker, all
  gated on `file.type.startsWith('image/')`, call `uploadApi.uploadImage(file)`, insert
  `![name](url)`.
- `frontend/src/views/ThreadCreateView.vue` — uses `<MarkdownEditor v-model="content">`; submits
  `content` as a plain string. **Attachments are Markdown links inside `content` — no forum DB or
  thread/post schema change is required.**

**Axite CDN** (`~/github/cdn-axite`, MinIO-backed, owned by us)
- `app/src/plugins/upload.plugin.ts` — `POST /v1/upload`, multipart, **buffers `arrayBuffer()` into
  RAM**, enforces `config.upload.allowedMime` (image/* + pdf + mp4) and
  `config.upload.maxFileBytes` (default 100 MB), checks per-tenant quota, writes via
  `storageService.putBuffer`, records an `assets` row, bumps `tenants.usedBytes`.
- `app/src/services/storage.service.ts` — wraps the `minio` SDK (`putBuffer`, `getStream`, `stat`,
  `remove`, `presignedGet`). **No multipart-upload primitives yet.** Only dep is `minio ^8.0.2`.
- `app/src/plugins/asset.plugin.ts` — public `GET /files/*` serves the object with
  `content-type: <mimeType>` **inline, with no `Content-Disposition`**. Safe for images today;
  unsafe for arbitrary HTML/SVG/JS (stored-XSS / drive-by) once any type is allowed.
- `app/src/plugins/signed-url.plugin.ts` — JWT read/download signing for *private* assets. This is
  **not** an upload mechanism and is not used by this feature.
- `config.ts` — MinIO creds (`MINIO_*`), `publicUrl`, `upload.maxFileBytes`, `upload.allowedMime`.

## 4. Architecture

```
                         each request < Cloudflare cap (default 90 MB)
Browser                                                              Axite (cdn-axite)            MinIO
  │  slice file into N chunks                                              │                        │
  ├── POST /v1/upload/multipart/create  (filename, mime, size) ──────────► │ CreateMultipartUpload ►│
  │       ◄───────────────────────── { upload_id, object_key } ───────────┤                        │
  │                                                                        │                        │
  ├── PUT  /v1/upload/multipart/part   (upload_id, part_number, bytes) ──► │ UploadPart ───────────►│
  │       ◄───────────────────────────────── { etag } ───────────────────┤                        │
  │   … repeat for every chunk (retryable / resumable per part) …          │                        │
  │                                                                        │                        │
  ├── POST /v1/upload/multipart/complete (upload_id, [{part,etag}]) ─────► │ CompleteMultipartUpload│
  │       ◄────────────── { id, url, size_bytes, mime_type } ─────────────┤ + insert asset row     │
  │                                                                        │ + bump tenant quota    │
  └── insert Markdown `[filename](url)` into the editor                    │                        │
```

Browser → Axite traffic goes through the **forum backend as a thin broker** (so the CDN API key
never reaches the browser and per-user authz/limits apply), OR directly to Axite with a
short-lived scoped token. See §5 decision.

### 4.1 Axite changes (`cdn-axite`)

Add **`@aws-sdk/client-s3`** (MinIO is S3-compatible; reuse the existing `MINIO_*` creds and
`bucket`). The `minio` JS SDK does not cleanly expose `UploadPart`; the AWS SDK does, with native
resumable multipart and no temp-object staging.

Extend `storage.service.ts` with:
- `createMultipart(objectKey, contentType, metadata) → uploadId`
- `uploadPart(objectKey, uploadId, partNumber, body, length) → etag`
- `completeMultipart(objectKey, uploadId, parts[]) → { etag }`
- `abortMultipart(objectKey, uploadId)`

New plugin `multipart-upload.plugin.ts`, prefix `/v1/upload/multipart`, `requireAuth`:
- `POST /create` — validate mime (see §6) and that `size ≤ config.upload.maxFileBytes` (raise the
  cap, §4.4) and that `tenant.usedBytes + size ≤ quotaBytes`; `object_key = {tenantId}/{uuid}.{ext}`;
  `CreateMultipartUpload`; return `{ upload_id, object_key }`. Throttle via the existing
  `cacheService.rateLimit`.
- `PUT /part` — body is one chunk (`type: multipart/form-data` field `file`, or raw body). Stream /
  buffer one bounded chunk (≤ chunk size, RAM-safe), `UploadPart`, return `{ etag }`. No DB write.
- `POST /complete` — `CompleteMultipartUpload` with the ordered `[{ PartNumber, ETag }]`; then
  `stat` the object for the authoritative size; insert the `assets` row and bump `tenants.usedBytes`
  in the same transaction the current `/v1/upload` uses; return the same response shape as
  `/v1/upload` (`{ id, object_key, url, size_bytes, mime_type, ... }`).
- `POST /abort` — `AbortMultipartUpload` + best-effort cleanup; called by the client on
  cancel/failure.

**Quota race note:** quota is only *pre-checked* at `create` (against declared size) and *committed*
at `complete` (against the real stat size). Two concurrent large uploads could both pass the
pre-check and jointly exceed quota. Acceptable for a single-tenant forum; documented as a known
limitation. A stricter design would reserve quota at `create`.

**Orphan cleanup:** incomplete multipart uploads leave parts in MinIO. Configure an S3 lifecycle
rule (`AbortIncompleteMultipartUpload` after e.g. 24h) on the bucket, or a periodic
`ListMultipartUploads` sweep. Documented as an operational task.

### 4.2 Axite serve-path hardening (`asset.plugin.ts`) — security-critical

Once arbitrary types are allowed, `GET /files/*` must not serve attacker-controlled HTML/SVG/JS
inline from the CDN origin. Change the public serve path so that any object whose `mimeType` is
**not** in a small inline-safe allowlist (images + `video/mp4` + `application/pdf`) is sent with:
```
Content-Disposition: attachment; filename="<originalName>"
Content-Type: application/octet-stream   # for the unsafe set
X-Content-Type-Options: nosniff
```
Inline-safe types keep their real `Content-Type` and inline disposition so images still render in
the post. This is the single most important security control of the feature.

### 4.3 `allowedMime` → accept any type

User decision: **any file type**. Replace the mime allowlist check with: accept any non-empty mime
(default `application/octet-stream`). Combined with §4.2 (forced download for non-renderable types)
and §6 size/quota limits. Keep a tiny *blocklist*-free posture but rely on `Content-Disposition`
for safety rather than blocking extensions.

### 4.4 Raise `config.upload.maxFileBytes`

Set `UPLOAD_MAX_BYTES` to 10 GB (`10 * 1024 * 1024 * 1024`) for the multipart path. The legacy
single-shot `POST /v1/upload` keeps a low cap (it buffers into RAM) — large files must use the
multipart endpoints. Enforce per-chunk size server-side (`≤ configured chunk max + slack`) so a
client can't push an oversized single part.

### 4.5 Forum changes

**Backend (`forum`)** — decision in §5 picks one:
- **Broker mode (recommended):** new `POST /upload/attachment/*` routes that proxy create/part/
  complete/abort to Axite, attaching `Authorization: Bearer {CDN_API_KEY}` server-side and enforcing
  `auth: true` (logged-in users only, consistent with the current image upload). The chunk bytes
  pass through the forum backend but are **bounded per chunk** (≤90 MB), so RAM stays safe — never
  the whole 10 GB. Remove the image-only `safeExt` gate for this path.
- Keep `/upload/image` unchanged for inline images (small, simple).

**Frontend (`MarkdownEditor.vue`)**
- Generalise the paste/drop/picker handlers: drop the `startsWith('image/')` gate. Route images
  through the existing `uploadImage` path (inline `![]()`); route everything else through a new
  `uploadAttachment(file)` that does the chunked multipart flow and inserts `[filename](url)`.
- New upload manager: slice via `File.slice(start, end)`, sequential (or small concurrency) part
  uploads, retry-per-part with backoff, overall **progress bar** (bytes uploaded / total), and a
  **Cancel** that calls `/abort`. Replace the current single boolean `isUploadingImage` overlay with
  a per-upload progress state that supports multiple queued files.
- Insert a placeholder token while uploading (e.g. `[Uploading report.zip… 37%]()`) and replace it
  with `[report.zip](url)` on success, or remove it on failure — mirroring the existing image
  placeholder logic.
- API client: add `uploadApi.uploadAttachment(file, { onProgress, signal })` in
  `frontend/src/api/likes.ts` (where `UploadApi` lives) talking to the broker routes.

**No changes** to `ThreadCreateView.vue`, `threadsApi`, thread/post schema — attachments are links
inside `content`. `MarkdownRenderer.vue` already renders Markdown links; confirm DOMPurify keeps
`href` to the CDN origin (it does for `https:` links).

## 5. Open decision for the plan: broker vs. direct-to-Axite

| | Broker through forum backend (recommended) | Browser → Axite directly |
|---|---|---|
| CDN API key | stays server-side ✅ | needs a short-lived scoped token endpoint |
| Authz / per-user limits | natural (forum `auth`) ✅ | must be built into the token |
| CORS | none (same flow as today) ✅ | Axite must allow the forum origin + custom headers |
| Extra hops for 10 GB | +1 hop per chunk (browser→forum→axite) | one fewer hop |
| Reuses prod internal network | yes (`axite-elysia:3000`) ✅ | yes |

**Recommendation: broker mode.** It mirrors the existing, working image-upload trust model
(key server-side, `auth: true`), needs no CORS work, and the per-chunk bound keeps the extra hop
cheap. Revisit only if the double hop proves too slow for 10 GB in practice.

## 6. Validation, limits, security summary

- **Per-file:** ≤10 GB (declared at `create`, enforced again at `complete` via stat).
- **Per-chunk:** ≤ chunk size + slack, server-enforced.
- **Quota:** existing per-tenant `quotaBytes`; pre-check at create, commit at complete (race caveat
  §4.1).
- **Type:** any; safety via forced `Content-Disposition: attachment` + `X-Content-Type-Options:
  nosniff` for non-renderable types (§4.2). Filename sanitised before use in headers/object keys
  (object key already uses a UUID; original name only in metadata + `filename=` header, escaped).
- **Auth:** logged-in users only (broker `auth: true`), same as current image upload.
- **Rate limit:** reuse Axite's per-tenant upload throttle on `create`; forum-side limiter on the
  broker routes.

## 7. Out of scope (YAGNI)

- Direct browser→MinIO presigned upload + public MinIO exposure / port-forward (the chunked path
  removes the need; would only reduce hops).
- A dedicated forum `attachments` table / attachment management UI (links-in-content is enough for
  v1).
- Virus scanning, image transcoding/thumbnails for non-images, drag-to-reorder.
- Resumable-across-page-reload (in-memory resume within a session only for v1).

## 8. Definition of done

1. Axite: 4 multipart endpoints live; `allowedMime` accepts any type; non-renderable types served as
   attachments with `nosniff`; `UPLOAD_MAX_BYTES` raised; aborted/lifecycle cleanup configured.
2. Forum backend: `/upload/attachment/*` broker routes (auth), image-only gate removed for them.
3. Editor: paste/drop/pick any file → chunked upload with progress + cancel → `[name](url)` inserted;
   images still inline.
4. Verified e2e on prod-like setup: a >100 MB file (proves the Cloudflare cap is bypassed) and a
   small non-image both upload, the link resolves, and the file downloads (not rendered inline).
5. A non-image is confirmed served with `Content-Disposition: attachment`.

## 9. Affected files (reference)

**cdn-axite:** `app/package.json` (+`@aws-sdk/client-s3`), `app/src/services/storage.service.ts`,
new `app/src/plugins/multipart-upload.plugin.ts`, `app/src/plugins/asset.plugin.ts`,
`app/src/config.ts`, `app/src/index.ts` (register plugin), bucket lifecycle config.

**forum backend:** `backend/src/routes/upload.routes.ts` (or new `attachment.routes.ts`),
`backend/src/services/storage.service.ts` (multipart broker calls), register route in
`backend/src/index.ts`.

**forum frontend:** `frontend/src/components/MarkdownEditor.vue`, `frontend/src/api/likes.ts`
(`UploadApi`), possibly a small `frontend/src/api/upload-chunked.ts` helper.
