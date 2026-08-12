import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sendDigestEmail } from '../utils/mailer.js';
import { logger } from '../utils/logger.js';

/**
 * Weekly digest: for each user with unread notifications or watches with activity,
 * send a summary email (best-effort; no-op without SMTP).
 */
export class DigestService {
  async sendWeekly(): Promise<{ sent: number; skipped: number }> {
    const res: any = await db.execute(sql`
      SELECT u.id, u.email, u.name,
        (SELECT COUNT(*) FROM notifications n WHERE n.user_id = u.id AND n.read_at IS NULL)::int AS unread
      FROM users u
      WHERE u.is_banned = false
        AND u.email IS NOT NULL
        AND (
          EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.read_at IS NULL AND n.created_at >= NOW() - INTERVAL '7 days')
          OR EXISTS (SELECT 1 FROM thread_watches w WHERE w.user_id = u.id)
        )
      LIMIT 500
    `);
    const rows: any[] = res.rows ?? res;
    let sent = 0;
    let skipped = 0;
    const site = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:5173';

    for (const r of rows) {
      try {
        if (!r.email || Number(r.unread ?? 0) === 0) {
          skipped += 1;
          continue;
        }
        await sendDigestEmail(String(r.email), String(r.name || 'there'), {
          unread: Number(r.unread ?? 0),
          siteUrl: site.replace(/\/+$/, ''),
        });
        sent += 1;
      } catch (err) {
        logger.error('digest email failed', {
          userId: r.id,
          message: err instanceof Error ? err.message : String(err),
        });
        skipped += 1;
      }
    }
    return { sent, skipped };
  }
}

export const digestService = new DigestService();
