import path from 'path';
import fs from 'fs';
import { extForMime, sniffImageType } from '../domain/upload.js';

export interface UploadInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface UploadResult {
  url: string;
}

interface StorageDriver {
  upload(file: UploadInput, prefix: string): Promise<UploadResult>;
}

/**
 * Decide the on-disk extension. Never trust the client filename: derive it from
 * the magic bytes (preferred) or the declared MIME, both restricted to the image
 * whitelist. Throws if the bytes are not a recognised image.
 */
const safeExt = (file: UploadInput): string => {
  const sniffed = sniffImageType(file.buffer);
  const ext = extForMime(sniffed ?? file.mimetype);
  if (!sniffed || !ext) {
    throw new Error('Unsupported or mismatched file type — only JPEG, PNG, GIF, WebP images are allowed');
  }
  return ext;
};

// ─── local: save to ./uploads, served by this backend at /uploads ────────────
const uploadsDir = path.join(process.cwd(), 'uploads');

const localDriver: StorageDriver = {
  async upload(file, prefix) {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const name = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt(file)}`;
    await fs.promises.writeFile(path.join(uploadsDir, name), file.buffer);

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3636}`;
    return { url: `${backendUrl}/uploads/${name}` };
  },
};

// ─── cdn: forward to Axite CDN (POST /v1/upload), key stays server-side ───────
const cdnDriver: StorageDriver = {
  async upload(file, _prefix) {
    safeExt(file); // validate bytes/MIME; throws on non-image
    const baseUrl = process.env.CDN_BASE_URL;
    const apiKey = process.env.CDN_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error(
        'STORAGE_DRIVER=cdn but CDN_BASE_URL / CDN_API_KEY is not configured in the environment'
      );
    }

    // Copy into a plain ArrayBuffer-backed view so it satisfies BlobPart under strict types.
    const bytes = new Uint8Array(file.buffer.byteLength);
    bytes.set(file.buffer);

    const form = new FormData();
    form.append('file', new Blob([bytes], { type: file.mimetype }), file.originalname);

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`CDN upload failed (HTTP ${res.status}): ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as { url?: string };
    if (!data.url) {
      throw new Error('CDN upload succeeded but the response did not include a "url" field');
    }
    return { url: data.url };
  },
};

const driver: StorageDriver = process.env.STORAGE_DRIVER === 'cdn' ? cdnDriver : localDriver;

export const storage = {
  /**
   * Persist an uploaded file and return its public URL.
   * @param prefix filename prefix used by the local driver (e.g. 'avatar', 'img')
   */
  upload(file: UploadInput, prefix = 'file'): Promise<UploadResult> {
    return driver.upload(file, prefix);
  },
};
