import { z } from 'zod';
import { TIERS as TIER_DEFS } from '../domain/tiers.js';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const RegisterDTO = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  password: z.string().min(8).max(100),
});
export type RegisterDTO = z.infer<typeof RegisterDTO>;

export const LoginDTO = z.object({
  email: z.string().email().max(254),
  password: z.string().max(100),
});
export type LoginDTO = z.infer<typeof LoginDTO>;

export const GoogleAuthDTO = z.object({
  idToken: z.string(),
});
export type GoogleAuthDTO = z.infer<typeof GoogleAuthDTO>;

export const ForgotPasswordDTO = z.object({
  email: z.string().email().max(254),
});
export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordDTO>;

export const ResetPasswordDTO = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
});
export type ResetPasswordDTO = z.infer<typeof ResetPasswordDTO>;

export const RefreshDTO = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDTO = z.infer<typeof RefreshDTO>;

export const LogoutDTO = z.object({
  refreshToken: z.string().optional(),
});
export type LogoutDTO = z.infer<typeof LogoutDTO>;

// ─── Forums ───────────────────────────────────────────────────────────────────
export const CreateForumDTO = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export type CreateForumDTO = z.infer<typeof CreateForumDTO>;

// "At least one field" is enforced in the route handler (same as before).
export const UpdateForumDTO = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});
export type UpdateForumDTO = z.infer<typeof UpdateForumDTO>;

// ─── Threads ──────────────────────────────────────────────────────────────────
export const CreateThreadDTO = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  forumId: z.string().min(1),
});
export type CreateThreadDTO = z.infer<typeof CreateThreadDTO>;

export const UpdateThreadDTO = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
});
export type UpdateThreadDTO = z.infer<typeof UpdateThreadDTO>;

// ─── Posts ────────────────────────────────────────────────────────────────────
export const CreatePostDTO = z.object({
  content: z.string().min(1).max(50000),
  threadId: z.string().min(1),
});
export type CreatePostDTO = z.infer<typeof CreatePostDTO>;

export const UpdatePostDTO = z.object({
  content: z.string().min(1).max(50000),
});
export type UpdatePostDTO = z.infer<typeof UpdatePostDTO>;

// ─── Users ────────────────────────────────────────────────────────────────────
export const UpdateUserDTO = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().max(2000).optional(),
  banner: z.string().max(2000).optional(),
  bio: z.string().max(500).optional(),
});
export type UpdateUserDTO = z.infer<typeof UpdateUserDTO>;

// ─── Tier (rank) — admin-assigned, mirrors domain/tiers.ts (single source) ────
export const TIERS = TIER_DEFS.map((td) => td.key) as readonly string[];
export type Tier = string;

export const UpdateUserTierDTO = z.object({
  tier: z.enum(TIER_DEFS.map((td) => td.key) as [string, ...string[]]),
});
export type UpdateUserTierDTO = z.infer<typeof UpdateUserTierDTO>;

export const UpdateUserRoleDTO = z.object({
  role: z.enum(['user', 'admin']),
});
export type UpdateUserRoleDTO = z.infer<typeof UpdateUserRoleDTO>;

export const BanUserDTO = z.object({
  reason: z.string().min(3).max(500),
});
export type BanUserDTO = z.infer<typeof BanUserDTO>;

// ─── Shared query models ──────────────────────────────────────────────────────
// z.coerce.number() coerces numeric query strings ("?page=2" → 2), matching
// the old t.Numeric behaviour; .default() fills absent params.
export const Pagination = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const AdminPagination = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

// ─── Reports & badges ─────────────────────────────────────────────────────────
export const ReportDTO = z.object({
  targetType: z.enum(['thread', 'post', 'user']),
  targetId: z.string().min(1),
  reason: z.string().min(3).max(500),
});
export type ReportDTO = z.infer<typeof ReportDTO>;

export const ReportStatusDTO = z.object({
  status: z.enum(['open', 'reviewed', 'dismissed']),
});
export type ReportStatusDTO = z.infer<typeof ReportStatusDTO>;

export const ReportQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
});

export const GrantBadgeDTO = z.object({
  badgeKey: z.string().min(1).max(50),
});
export type GrantBadgeDTO = z.infer<typeof GrantBadgeDTO>;

// key is lowercase letters/digits/underscore so it's a safe stable identifier.
export const CreateBadgeDTO = z.object({
  key: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/),
  label: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  icon: z.string().min(1).max(16),
});
export type CreateBadgeDTO = z.infer<typeof CreateBadgeDTO>;

export const UpdateBadgeDTO = z.object({
  label: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(300).optional(),
  icon: z.string().min(1).max(16).optional(),
});
export type UpdateBadgeDTO = z.infer<typeof UpdateBadgeDTO>;

// User payload stored in JWT
export interface JwtPayload {
  userId: string;
}
