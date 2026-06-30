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

/**
 * Thrown when `cancel()` stopped the upload, so callers can distinguish a
 * user-initiated cancel from a real network/server failure without
 * string-matching `err.message` (use `err instanceof UploadCancelledError`
 * or `err.name === 'UploadCancelledError'`).
 */
export class UploadCancelledError extends Error {
  constructor() {
    super('Upload cancelled');
    this.name = 'UploadCancelledError';
  }
}

export interface ChunkedUploadHandle {
  promise: Promise<CompleteResult>;
  /**
   * Stops the upload before its *next* chunk starts — it does not abort a
   * chunk PUT already in flight (this client has no AbortSignal plumbing),
   * so cancellation can take up to one chunk's transfer time to apply.
   */
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
      if (cancelled) throw new UploadCancelledError();
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
