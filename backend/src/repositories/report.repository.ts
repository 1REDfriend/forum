import { eq, desc, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { reports, users } from '../db/schema.js';

export class ReportRepository {
  /** Insert a report. Returns the row, or undefined if the reporter already reported this target. */
  async create(reporterId: number, targetType: string, targetId: number, reason: string) {
    const [row] = await db
      .insert(reports)
      .values({ reporterId, targetType, targetId, reason })
      .onConflictDoNothing()
      .returning();
    return row;
  }

  async list(page: number, limit: number, status?: string) {
    const offset = (page - 1) * limit;
    const where = status ? eq(reports.status, status) : undefined;

    const data = await db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
        reporterName: users.name,
        targetType: reports.targetType,
        targetId: reports.targetId,
        reason: reports.reason,
        status: reports.status,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(where)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    const [c] = await db.select({ total: count() }).from(reports).where(where);
    return { data, total: c?.total ?? 0 };
  }

  async setStatus(id: number, status: string) {
    const [row] = await db.update(reports).set({ status }).where(eq(reports.id, id)).returning();
    return row;
  }
}

export const reportRepository = new ReportRepository();
