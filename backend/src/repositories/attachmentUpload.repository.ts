import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { attachmentUploads } from '../db/schema.js';

export class AttachmentUploadRepository {
  /** Record who started a CDN multipart upload, right after `/create` succeeds. */
  async record(input: { uploadId: string; objectKey: string; userId: string }): Promise<void> {
    await db.insert(attachmentUploads).values({
      uploadId: input.uploadId,
      objectKey: input.objectKey,
      userId: input.userId,
    });
  }

  /** True if `userId` is the one who started `uploadId` (and it matches `objectKey`). */
  async isOwnedBy(input: { uploadId: string; objectKey: string; userId: string }): Promise<boolean> {
    const [row] = await db
      .select()
      .from(attachmentUploads)
      .where(eq(attachmentUploads.uploadId, input.uploadId));
    return !!row && row.objectKey === input.objectKey && row.userId === input.userId;
  }

  /** Best-effort cleanup after complete/abort — a stale row is harmless but no reason to keep it. */
  async deleteByUploadId(uploadId: string): Promise<void> {
    await db.delete(attachmentUploads).where(eq(attachmentUploads.uploadId, uploadId));
  }
}

export const attachmentUploadRepository = new AttachmentUploadRepository();
