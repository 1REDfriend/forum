// ==========================================
// Domain Models
// ==========================================

export interface User {
  id: number;
  name: string;
  email: string;
  googleId: string | null;
  authProvider: 'local' | 'google';
  role: 'user' | 'admin';
  tier: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  createdAt: string;
}

// Author info shown on a post/thread profile card
export interface PostAuthor {
  id: number;
  name: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  role: 'user' | 'admin';
  tier: string;
}

export interface Forum {
  id: number;
  name: string;
  description: string | null;
  createdBy: number | null;
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
  id: number;
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
    id: number;
    name: string;
  };
}

// Simple Thread representation returned upon creation
export interface ThreadSimple {
  id: number;
  title: string;
  content: string;
  authorId: number;
  forumId: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

// Post representation returned by queries (includes author info)
export interface PostDetail {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  author: PostAuthor;
}

// Simple Post representation returned upon creation
export interface PostSimple {
  id: number;
  content: string;
  threadId: number;
  authorId: number;
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
  id: number;
  name: string;
  description: string | null;
  type: 'forum';
}

export interface SearchThreadResult {
  id: number;
  title: string;
  content: string;
  authorName: string;
  forumName: string;
  forumId: number;
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
  forumId: number;
}

export interface UpdateThreadDTO {
  title?: string;
  content?: string;
}

export interface CreatePostDTO {
  content: string;
  threadId: number;
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
}

// ─── Tiers (rank) ────────────────────────────────────────────────────────────
export const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;
export type Tier = (typeof TIERS)[number];

interface TierStyle {
  bg: string;
  color: string;
  ring: string;
}

const TIER_STYLES: Record<string, TierStyle> = {
  Bronze: { bg: '#f6e3d3', color: '#9a5b2e', ring: '#d9a978' },
  Silver: { bg: '#e9edf2', color: '#566175', ring: '#c2ccd9' },
  Gold: { bg: '#fdf0c9', color: '#a9790f', ring: '#f1c44b' },
  Platinum: { bg: '#d7f3ea', color: '#0a7c66', ring: '#7fd8c2' },
  Diamond: { bg: '#dcefff', color: '#0a6aa1', ring: '#7cc9f0' },
};

const DEFAULT_TIER_STYLE: TierStyle = TIER_STYLES.Bronze!;

export const tierStyle = (tier?: string | null): TierStyle =>
  TIER_STYLES[tier ?? ''] ?? DEFAULT_TIER_STYLE;
