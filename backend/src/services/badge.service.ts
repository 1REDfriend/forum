import { earnedAutoBadgeKeys, BADGE_MAP, type BadgeStats } from '../domain/badges.js';
import { userBadgeRepository } from '../repositories/userBadge.repository.js';

export interface AwardedBadge {
  key: string;
  label: string;
  desc: string;
  icon: string;
  awardedAt: Date;
}

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

  /** Admin grant (or any catalog badge). Returns false for an unknown key. */
  async grant(userId: string, badgeKey: string): Promise<boolean> {
    if (!BADGE_MAP[badgeKey]) return false;
    await userBadgeRepository.award(userId, [badgeKey]);
    return true;
  }
}

export const badgeService = new BadgeService();
