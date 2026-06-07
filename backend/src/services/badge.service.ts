import { earnedAutoBadgeKeys, BADGES, BADGE_MAP, type BadgeStats, type BadgeDef } from '../domain/badges.js';
import { userBadgeRepository } from '../repositories/userBadge.repository.js';

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

export class BadgeService {
  /** Award any newly-earned auto badges, then return the user's full (catalog-enriched) list. */
  async syncAndGet(userId: string, stats: BadgeStats): Promise<AwardedBadge[]> {
    await userBadgeRepository.award(userId, earnedAutoBadgeKeys(stats));
    const rows = await userBadgeRepository.listForUser(userId);
    return rows.flatMap((r) => {
      const def = BADGE_MAP[r.badgeKey];
      return def ? [{ key: def.key, label: def.label, desc: def.desc, icon: def.icon, awardedAt: r.awardedAt }] : [];
    });
  }

  /** Full badge catalog (single source of truth for admin UIs). */
  catalog(): BadgeDef[] {
    return BADGES;
  }

  /**
   * Admin grant. Tells the caller whether the key is unknown or already held,
   * so the API can return a meaningful status instead of a silent no-op.
   */
  async grant(userId: string, badgeKey: string): Promise<GrantResult> {
    if (!BADGE_MAP[badgeKey]) return { ok: false, reason: 'unknown' };
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
