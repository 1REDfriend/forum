// ==========================================
// Domain Models
// ==========================================

export interface User {
  id: string;
  name: string;
  email: string;
  googleId: string | null;
  authProvider: 'local' | 'google';
  role: 'user' | 'manager' | 'admin';
  tier: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  createdAt: string;
}

// Author info shown on a post/thread profile card
export interface PostAuthor {
  id: string;
  name: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  role: 'user' | 'manager' | 'admin';
  tier: string;
}

export interface Forum {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ForumWithStats extends Forum {
  threadCount: number;
  postCount: number;
  lastPostAt: string | null;
  lastPostAuthor: string | null;
}

// Thread representation returned by queries (includes author and forum info)
export interface ThreadDetail {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  likeCount: number;
  isLikedByMe: boolean;
  replyCount: number;
  lastPostAt: string | null;
  lastPostAuthor: string | null;
  createdAt: string;
  author: PostAuthor;
  forum: {
    id: string;
    name: string;
  };
}

// Simple Thread representation returned upon creation
export interface ThreadSimple {
  id: string;
  title: string;
  content: string;
  authorId: string;
  forumId: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

// Post representation returned by queries (includes author info)
export interface PostDetail {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  author: PostAuthor;
}

// Simple Post representation returned upon creation
export interface PostSimple {
  id: string;
  content: string;
  threadId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Pagination
// ==========================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// Search
// ==========================================

export interface SearchForumResult {
  id: string;
  name: string;
  description: string | null;
  type: 'forum';
}

export interface SearchThreadResult {
  id: string;
  title: string;
  content: string;
  authorName: string;
  forumName: string;
  forumId: string;
  type: 'thread';
}

export interface SearchResponse {
  forums: SearchForumResult[];
  threads: SearchThreadResult[];
}

// ==========================================
// Data Transfer Objects (DTOs)
// ==========================================

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface GoogleAuthDTO {
  idToken: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  password: string;
}

export interface CreateForumDTO {
  name: string;
  description?: string;
}

export interface UpdateForumDTO {
  name?: string;
  description?: string;
}

export interface CreateThreadDTO {
  title: string;
  content: string;
  forumId: string;
}

export interface UpdateThreadDTO {
  title?: string;
  content?: string;
}

export interface CreatePostDTO {
  content: string;
  threadId: string;
}

export interface UpdatePostDTO {
  content: string;
}

export interface UpdateUserDTO {
  name?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
}

// ==========================================
// API Response Structures
// ==========================================

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// ─── Tiers (journey/growth) — mirrors backend src/domain/tiers.ts ─────────────
export type Tier = string;

export interface TierDef {
  key: string;
  label: string;
  icon: string;
  minScore: number;
  bg: string;
  color: string;
  ring: string;
}

export const TIERS: TierDef[] = [
  { key: 'wanderer',  label: 'เริ่มเดินทาง', icon: '🌱', minScore: 0,    bg: '#dcfce7', color: '#166534', ring: '#86efac' },
  { key: 'sprout',    label: 'ก้าวแรก',      icon: '🌿', minScore: 60,   bg: '#ccfbf1', color: '#0f766e', ring: '#5eead4' },
  { key: 'growing',   label: 'เติบโต',       icon: '🌳', minScore: 180,  bg: '#e0f2fe', color: '#075985', ring: '#7dd3fc' },
  { key: 'strong',    label: 'แข็งแกร่ง',    icon: '🏔️', minScore: 450,  bg: '#e0e7ff', color: '#3730a3', ring: '#a5b4fc' },
  { key: 'conqueror', label: 'ผู้พิชิต',     icon: '👑', minScore: 1000, bg: '#fef3c7', color: '#92400e', ring: '#fcd34d' },
];

export const TIER_MAP: Record<string, TierDef> = Object.fromEntries(TIERS.map((t) => [t.key, t]));
const DEFAULT_TIER: TierDef = TIERS[0]!;

/** Resolve a tier key → its display def (label/icon/colors). Falls back to the first tier. */
export const tierStyle = (tier?: string | null): TierDef => TIER_MAP[tier ?? ''] ?? DEFAULT_TIER;

export interface Badge {
  key: string;
  label: string;
  desc: string;
  icon: string;
  awardedAt?: string;
}

export interface ProfileStats {
  posts: number;
  threads: number;
  likesReceived: number;
  accountAgeDays: number;
  loginStreak: number;
  longestStreak: number;
  reports: number;
}

export interface TierProgress {
  score: number;
  tier: string; // stored key (monotonic)
  currentTier: TierDef;
  nextTier: TierDef | null;
  progress: number; // 0..1
  pointsToNext: number;
}
