// Badge domain — definitions now live in the `badges` DB table (admin CRUD).
// This file keeps two things that CANNOT live in the DB:
//   1. AUTO_RULES — the award logic for auto badges (JS predicates over stats).
//      A DB-defined badge whose key has no entry here is "admin-granted only".
//   2. SEED_BADGES — the original built-in badges, seeded into the table by the
//      migration so existing installs keep working. Admins may edit/delete them.
//
// To add a new badge type now: use the Admin → Badges tab (+ New badge). Only badges
// whose key matches an AUTO_RULES entry are auto-awarded; everything else is granted
// manually by admins. To add a NEW auto rule you still edit AUTO_RULES + redeploy.
export interface BadgeStats {
  posts: number; // threads + posts authored
  likesReceived: number;
  accountAgeDays: number;
  longestStreak: number;
}

export interface BadgeDef {
  key: string;
  label: string;
  desc: string;
  icon: string;
}

/** Award predicates for the built-in auto badges, keyed by badge key. */
export const AUTO_RULES: Record<string, (s: BadgeStats) => boolean> = {
  first_post: (s) => s.posts >= 1,
  writer_50: (s) => s.posts >= 50,
  loved_100: (s) => s.likesReceived >= 100,
  year_one: (s) => s.accountAgeDays >= 365,
  streak_30: (s) => s.longestStreak >= 30,
};

/** Original built-in badges — seeded into the `badges` table by migration 0007. */
export const SEED_BADGES: BadgeDef[] = [
  { key: 'first_post', label: 'ก้าวแรก', desc: 'โพสต์แรกของคุณ', icon: '✍️' },
  { key: 'writer_50', label: 'นักเขียน', desc: 'โพสต์/กระทู้ครบ 50', icon: '📚' },
  { key: 'loved_100', label: 'ขวัญใจมหาชน', desc: 'ได้รับ Like ครบ 100', icon: '💖' },
  { key: 'year_one', label: 'ครบ 1 ปี', desc: 'อยู่กับชุมชนครบ 1 ปี', icon: '🎂' },
  { key: 'streak_30', label: 'สม่ำเสมอ', desc: 'ล็อกอินต่อเนื่อง 30 วัน', icon: '🔥' },
  { key: 'helper', label: 'ผู้ช่วยเหลือชุมชน', desc: 'มอบโดยทีมงาน', icon: '🤝' }, // admin-granted
];

/**
 * Keys of auto badges whose rule is met by these stats.
 * `availableKeys` (the keys that still exist in the catalog) filters out rules
 * whose badge definition was deleted by an admin.
 */
export function earnedAutoBadgeKeys(stats: BadgeStats, availableKeys?: Set<string>): string[] {
  return Object.entries(AUTO_RULES)
    .filter(([key, rule]) => rule(stats) && (!availableKeys || availableKeys.has(key)))
    .map(([key]) => key);
}
