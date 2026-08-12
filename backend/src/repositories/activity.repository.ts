import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export type ActivityRow = {
  kind: 'thread' | 'post';
  id: string;
  threadId: string;
  threadTitle: string;
  forumId: string;
  forumName: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAt: Date | string;
};

export class ActivityRepository {
  async findRecent(limit: number): Promise<ActivityRow[]> {
    const rows = await db.execute(sql`
      (
        SELECT
          'thread'::text AS kind,
          t.id AS id,
          t.id AS thread_id,
          t.title AS thread_title,
          f.id AS forum_id,
          f.name AS forum_name,
          u.id AS author_id,
          u.name AS author_name,
          u.avatar AS author_avatar,
          t.content AS body,
          t.created_at AS created_at
        FROM threads t
        JOIN users u ON u.id = t.author_id
        JOIN forums f ON f.id = t.forum_id
      )
      UNION ALL
      (
        SELECT
          'post'::text AS kind,
          p.id AS id,
          t.id AS thread_id,
          t.title AS thread_title,
          f.id AS forum_id,
          f.name AS forum_name,
          u.id AS author_id,
          u.name AS author_name,
          u.avatar AS author_avatar,
          p.content AS body,
          p.created_at AS created_at
        FROM posts p
        JOIN users u ON u.id = p.author_id
        JOIN threads t ON t.id = p.thread_id
        JOIN forums f ON f.id = t.forum_id
      )
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    // node-postgres via drizzle: result may be { rows } or an array-like
    const res: any = rows;
    const list: Record<string, unknown>[] = res.rows ?? res;

    return list.map((r) => ({
      kind: r.kind as 'thread' | 'post',
      id: String(r.id),
      threadId: String(r.thread_id),
      threadTitle: String(r.thread_title),
      forumId: String(r.forum_id),
      forumName: String(r.forum_name),
      authorId: String(r.author_id),
      authorName: String(r.author_name),
      authorAvatar: (r.author_avatar as string | null) ?? null,
      body: String(r.body ?? ''),
      createdAt: r.created_at as Date | string,
    }));
  }

  async getPublicStats(): Promise<{
    members: number;
    threads: number;
    posts: number;
    forums: number;
  }> {
    const res: any = await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS members,
        (SELECT COUNT(*)::int FROM threads) AS threads,
        (SELECT COUNT(*)::int FROM posts) AS posts,
        (SELECT COUNT(*)::int FROM forums) AS forums
    `);
    const r = (res.rows ?? res)[0] ?? {};

    return {
      members: Number(r.members ?? 0),
      threads: Number(r.threads ?? 0),
      posts: Number(r.posts ?? 0),
      forums: Number(r.forums ?? 0),
    };
  }
}

export const activityRepository = new ActivityRepository();
