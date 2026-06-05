// Badge catalog — single source of truth (mirrored in frontend api/types.ts).
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
  /** Auto-award rule. Omitted → admin-granted only. */
  auto?: (s: BadgeStats) => boolean;
}

export const BADGES: BadgeDef[] = [
  { key: 'first_post', label: 'ก้าวแรก', desc: 'โพสต์แรกของคุณ', icon: '✍️', auto: (s) => s.posts >= 1 },
  { key: 'writer_50', label: 'นักเขียน', desc: 'โพสต์/กระทู้ครบ 50', icon: '📚', auto: (s) => s.posts >= 50 },
  { key: 'loved_100', label: 'ขวัญใจมหาชน', desc: 'ได้รับ Like ครบ 100', icon: '💖', auto: (s) => s.likesReceived >= 100 },
  { key: 'year_one', label: 'ครบ 1 ปี', desc: 'อยู่กับชุมชนครบ 1 ปี', icon: '🎂', auto: (s) => s.accountAgeDays >= 365 },
  { key: 'streak_30', label: 'สม่ำเสมอ', desc: 'ล็อกอินต่อเนื่อง 30 วัน', icon: '🔥', auto: (s) => s.longestStreak >= 30 },
  { key: 'helper', label: 'ผู้ช่วยเหลือชุมชน', desc: 'มอบโดยทีมงาน', icon: '🤝' }, // admin-granted
];

export const BADGE_MAP: Record<string, BadgeDef> = Object.fromEntries(BADGES.map((b) => [b.key, b]));

/** Keys of auto badges whose rule is met by these stats. */
export function earnedAutoBadgeKeys(stats: BadgeStats): string[] {
  return BADGES.filter((b) => b.auto?.(stats)).map((b) => b.key);
}
