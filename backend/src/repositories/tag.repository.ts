import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tags, threadTags } from '../db/schema.js';
import { newId } from '../db/ids.js';

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0e00-\u0e7f]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'tag';
}

export class TagRepository {
  async findOrCreateByLabel(label: string) {
    const slug = slugify(label);
    const [existing] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(tags)
      .values({ id: newId(), slug, label: label.trim() })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    const [again] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
    return again!;
  }

  async setThreadTags(threadId: string, labels: string[]) {
    const unique = [...new Set(labels.map((l) => l.trim()).filter(Boolean))].slice(0, 5);
    await db.delete(threadTags).where(eq(threadTags.threadId, threadId));
    for (const label of unique) {
      const tag = await this.findOrCreateByLabel(label);
      await db.insert(threadTags).values({ threadId, tagId: tag.id }).onConflictDoNothing();
    }
    return this.listForThread(threadId);
  }

  async listForThread(threadId: string) {
    return db
      .select({ id: tags.id, slug: tags.slug, label: tags.label })
      .from(threadTags)
      .innerJoin(tags, eq(threadTags.tagId, tags.id))
      .where(eq(threadTags.threadId, threadId));
  }

  async listForThreads(threadIds: string[]) {
    if (threadIds.length === 0) return new Map<string, { id: string; slug: string; label: string }[]>();
    const rows = await db
      .select({
        threadId: threadTags.threadId,
        id: tags.id,
        slug: tags.slug,
        label: tags.label,
      })
      .from(threadTags)
      .innerJoin(tags, eq(threadTags.tagId, tags.id))
      .where(inArray(threadTags.threadId, threadIds));
    const map = new Map<string, { id: string; slug: string; label: string }[]>();
    for (const r of rows) {
      const list = map.get(r.threadId) ?? [];
      list.push({ id: r.id, slug: r.slug, label: r.label });
      map.set(r.threadId, list);
    }
    return map;
  }

  async findThreadIdsBySlug(slug: string): Promise<string[]> {
    const rows = await db
      .select({ threadId: threadTags.threadId })
      .from(threadTags)
      .innerJoin(tags, eq(threadTags.tagId, tags.id))
      .where(eq(tags.slug, slug));
    return rows.map((r) => r.threadId);
  }

  async search(q: string, limit = 20) {
    const term = q.trim().toLowerCase();
    if (!term) {
      return db.select().from(tags).limit(limit);
    }
    return db
      .select()
      .from(tags)
      .where(sql`${tags.slug} ILIKE ${'%' + term + '%'} OR ${tags.label} ILIKE ${'%' + term + '%'}`)
      .limit(limit);
  }
}

export const tagRepository = new TagRepository();
