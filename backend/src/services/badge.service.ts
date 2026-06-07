import { earnedAutoBadgeKeys, type BadgeStats, type BadgeDef } from '../domain/badges.js';
import { userBadgeRepository } from '../repositories/userBadge.repository.js';
import { badgeRepository } from '../repositories/badge.repository.js';

export interface AwardedBadge {
  key: string;
  label: string;
  desc: string;
  icon: string;
  awardedAt: Date;
}

export type GrantResult =
  | { ok: true }
  | { ok: false; reason: 'unknown' | 'already_has' };

export type CreateResult =
  | { ok: true; badge: BadgeDef }
  | { ok: false; reason: 'duplicate' };

export class BadgeService {
  /** key → definition map from the DB catalog (used to enrich user badges). */
  private async defMap(): Promise<Map<string, BadgeDef>> {
    const defs = await badgeRepository.all();
    return new Map(defs.map((d) => [d.key, d]));
  }

  /** Award any newly-earned auto badges, then return the user's full (catalog-enriched) list. */
  async syncAndGet(userId: string, stats: BadgeStats): Promise<AwardedBadge[]> {
    const map = await this.defMap();
    await userBadgeRepository.award(userId, earnedAutoBadgeKeys(stats, new Set(map.keys())));
    const rows = await userBadgeRepository.listForUser(userId);
    return rows.flatMap((r) => {
      const def = map.get(r.badgeKey);
      return def ? [{ key: def.key, label: def.label, desc: def.desc, icon: def.icon, awardedAt: r.awardedAt }] : [];
    });
  }

  /**
   * Award newly-earned auto badges and return ONLY the ones just granted
   * (for an "earned & celebrate" toast). Empty array when nothing new.
   */
  async awardNewAuto(userId: string, stats: BadgeStats): Promise<AwardedBadge[]> {
    const map = await this.defMap();
    const newKeys = await userBadgeRepository.award(userId, earnedAutoBadgeKeys(stats, new Set(map.keys())));
    return newKeys.flatMap((key) => {
      const def = map.get(key);
      return def ? [{ key: def.key, label: def.label, desc: def.desc, icon: def.icon, awardedAt: new Date() }] : [];
    });
  }

  /** Full badge catalog (single source of truth for admin + public UIs). */
  catalog(): Promise<BadgeDef[]> {
    return badgeRepository.all();
  }

  // ─── Definition CRUD (admin) ──────────────────────────────────────────────

  async createDef(def: { key: string; label: string; description: string; icon: string }): Promise<CreateResult> {
    if (await badgeRepository.exists(def.key)) return { ok: false, reason: 'duplicate' };
    const badge = await badgeRepository.create(def);
    return { ok: true, badge };
  }

  updateDef(key: string, patch: Partial<{ label: string; description: string; icon: string }>) {
    return badgeRepository.update(key, patch);
  }

  deleteDef(key: string) {
    return badgeRepository.remove(key);
  }

  /**
   * Admin grant. Tells the caller whether the key is unknown or already held,
   * so the API can return a meaningful status instead of a silent no-op.
   */
  async grant(userId: string, badgeKey: string): Promise<GrantResult> {
    if (!(await badgeRepository.exists(badgeKey))) return { ok: false, reason: 'unknown' };
    if (await userBadgeRepository.has(userId, badgeKey)) return { ok: false, reason: 'already_has' };
    await userBadgeRepository.award(userId, [badgeKey]);
    return { ok: true };
  }

  /** Admin revoke. Returns false if the user didn't have the badge. */
  async revoke(userId: string, badgeKey: string): Promise<boolean> {
    return userBadgeRepository.revoke(userId, badgeKey);
  }
}

export const badgeService = new BadgeService();
