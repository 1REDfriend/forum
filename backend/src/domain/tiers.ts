// Journey/growth tier ladder — single source of truth (mirrored in frontend api/types.ts).
export interface TierDef {
  key: string;
  label: string; // Thai display label
  icon: string;
  minScore: number;
  color: string;
}

export const TIERS: TierDef[] = [
  { key: 'wanderer', label: 'เริ่มเดินทาง', icon: '🌱', minScore: 0, color: '#16a34a' },
  { key: 'sprout', label: 'ก้าวแรก', icon: '🌿', minScore: 60, color: '#0d9488' },
  { key: 'growing', label: 'เติบโต', icon: '🌳', minScore: 180, color: '#0284c7' },
  { key: 'strong', label: 'แข็งแกร่ง', icon: '🏔️', minScore: 450, color: '#4f46e5' },
  { key: 'conqueror', label: 'ผู้พิชิต', icon: '👑', minScore: 1000, color: '#d97706' },
];

export const tierIndex = (key: string): number => {
  const i = TIERS.findIndex((t) => t.key === key);
  return i < 0 ? 0 : i;
};

/** Lowest→highest tier whose minScore is met by `score`. */
export function tierForScore(score: number): TierDef {
  let result = TIERS[0]!;
  for (const t of TIERS) if (score >= t.minScore) result = t;
  return result;
}

/**
 * Progress toward the next tier, measured from the (monotonic) stored tier.
 * `storedKey` is the user's current persisted tier (never decreases).
 */
export function tierProgress(score: number, storedKey: string) {
  const idx = tierIndex(storedKey);
  const current = TIERS[idx]!;
  const next = TIERS[idx + 1] ?? null;
  if (!next) {
    return { progress: 1, pointsToNext: 0, currentTier: current, nextTier: null };
  }
  const span = next.minScore - current.minScore;
  const into = Math.min(span, Math.max(0, score - current.minScore));
  return {
    progress: span > 0 ? into / span : 1,
    pointsToNext: Math.max(0, next.minScore - score),
    currentTier: current,
    nextTier: next,
  };
}
