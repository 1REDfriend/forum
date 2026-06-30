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
    // Copy into a plain ArrayBuffer-backed view so it satisfies BodyInit under strict types
    // (mirrors the same workaround in storage.service.ts's cdnDriver).
    const bytes = new Uint8Array(input.body.byteLength);
    bytes.set(input.body);

    return fetch(`${baseUrl()}/v1/upload/multipart/part?${qs}`, {
      method: 'PUT',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/octet-stream' },
      body: bytes,
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
