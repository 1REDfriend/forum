import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { badges, userBadges } from '../db/schema.js';
import type { BadgeDef } from '../domain/badges.js';

export type BadgeRow = typeof badges.$inferSelect;

/** Map a DB row to the public BadgeDef shape (description → desc). */
function toDef(row: BadgeRow): BadgeDef {
  return { key: row.key, label: row.label, desc: row.description, icon: row.icon };
}

export class BadgeRepository {
  async all(): Promise<BadgeDef[]> {
    const rows = await db.select().from(badges).orderBy(asc(badges.createdAt));
    return rows.map(toDef);
  }

  async findByKey(key: string): Promise<BadgeDef | undefined> {
    const [row] = await db.select().from(badges).where(eq(badges.key, key)).limit(1);
    return row ? toDef(row) : undefined;
  }

  async exists(key: string): Promise<boolean> {
    const [row] = await db.select({ key: badges.key }).from(badges).where(eq(badges.key, key)).limit(1);
    return !!row;
  }

  async create(def: { key: string; label: string; description: string; icon: string }): Promise<BadgeDef> {
    const [row] = await db.insert(badges).values(def).returning();
    return toDef(row!);
  }

  async update(key: string, patch: Partial<{ label: string; description: string; icon: string }>): Promise<BadgeDef | undefined> {
    const [row] = await db.update(badges).set(patch).where(eq(badges.key, key)).returning();
    return row ? toDef(row) : undefined;
  }

  /** Delete a badge definition and any user-badge rows holding that key. */
  async remove(key: string): Promise<boolean> {
    await db.delete(userBadges).where(eq(userBadges.badgeKey, key));
    const deleted = await db.delete(badges).where(eq(badges.key, key)).returning({ key: badges.key });
    return deleted.length > 0;
  }
}

export const badgeRepository = new BadgeRepository();
