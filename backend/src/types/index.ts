import { t } from 'elysia';
import { TIERS as TIER_DEFS } from '../domain/tiers.js';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const RegisterDTO = t.Object({
  name: t.String({ minLength: 2, maxLength: 100 }),
  email: t.String({ format: 'email', maxLength: 254 }),
  password: t.String({ minLength: 6, maxLength: 100 }),
});
export type RegisterDTO = typeof RegisterDTO.static;

export const LoginDTO = t.Object({
  email: t.String({ format: 'email', maxLength: 254 }),
  password: t.String({ maxLength: 100 }),
});
export type LoginDTO = typeof LoginDTO.static;

export const GoogleAuthDTO = t.Object({
  idToken: t.String(),
});
export type GoogleAuthDTO = typeof GoogleAuthDTO.static;

export const ForgotPasswordDTO = t.Object({
  email: t.String({ format: 'email', maxLength: 254 }),
});
export type ForgotPasswordDTO = typeof ForgotPasswordDTO.static;

export const ResetPasswordDTO = t.Object({
  token: t.String({ minLength: 1 }),
  password: t.String({ minLength: 6, maxLength: 100 }),
});
export type ResetPasswordDTO = typeof ResetPasswordDTO.static;

export const RefreshDTO = t.Object({
  refreshToken: t.String({ minLength: 1 }),
});
export type RefreshDTO = typeof RefreshDTO.static;

export const LogoutDTO = t.Object({
  refreshToken: t.Optional(t.String()),
});
export type LogoutDTO = typeof LogoutDTO.static;

// ─── Forums ───────────────────────────────────────────────────────────────────
export const CreateForumDTO = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  description: t.Optional(t.String({ maxLength: 500 })),
});
export type CreateForumDTO = typeof CreateForumDTO.static;

// "At least one field" can't be expressed in TypeBox — the route handler enforces it.
export const UpdateForumDTO = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  description: t.Optional(t.String({ maxLength: 500 })),
});
export type UpdateForumDTO = typeof UpdateForumDTO.static;

// ─── Threads ──────────────────────────────────────────────────────────────────
export const CreateThreadDTO = t.Object({
  title: t.String({ minLength: 1, maxLength: 200 }),
  content: t.String({ minLength: 1, maxLength: 50000 }),
  forumId: t.Integer({ minimum: 1 }),
});
export type CreateThreadDTO = typeof CreateThreadDTO.static;

export const UpdateThreadDTO = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  content: t.Optional(t.String({ minLength: 1, maxLength: 50000 })),
});
export type UpdateThreadDTO = typeof UpdateThreadDTO.static;

// ─── Posts ────────────────────────────────────────────────────────────────────
export const CreatePostDTO = t.Object({
  content: t.String({ minLength: 1, maxLength: 50000 }),
  threadId: t.Integer({ minimum: 1 }),
});
export type CreatePostDTO = typeof CreatePostDTO.static;

export const UpdatePostDTO = t.Object({
  content: t.String({ minLength: 1, maxLength: 50000 }),
});
export type UpdatePostDTO = typeof UpdatePostDTO.static;

// ─── Users ────────────────────────────────────────────────────────────────────
export const UpdateUserDTO = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
  avatar: t.Optional(t.String({ maxLength: 2000 })),
  banner: t.Optional(t.String({ maxLength: 2000 })),
  bio: t.Optional(t.String({ maxLength: 500 })),
});
export type UpdateUserDTO = typeof UpdateUserDTO.static;

// ─── Tier (rank) — admin-assigned, mirrors domain/tiers.ts (single source) ────
export const TIERS = TIER_DEFS.map((td) => td.key) as readonly string[];
export type Tier = string;

export const UpdateUserTierDTO = t.Object({
  tier: t.Union(TIER_DEFS.map((td) => t.Literal(td.key))),
});
export type UpdateUserTierDTO = typeof UpdateUserTierDTO.static;

export const UpdateUserRoleDTO = t.Object({
  role: t.Union([t.Literal('user'), t.Literal('admin')]),
});
export type UpdateUserRoleDTO = typeof UpdateUserRoleDTO.static;

// ─── Shared query / param models ──────────────────────────────────────────────
// t.Numeric coerces numeric query/param strings to numbers (e.g. "?page=2" → 2).
export const Pagination = t.Object({
  page: t.Numeric({ minimum: 1, default: 1 }),
  limit: t.Numeric({ minimum: 1, maximum: 100, default: 20 }),
});

export const AdminPagination = t.Object({
  page: t.Numeric({ minimum: 1, default: 1 }),
  limit: t.Numeric({ minimum: 1, maximum: 100, default: 20 }),
  search: t.Optional(t.String()),
});

export const IdParam = t.Object({ id: t.Numeric() });

// ─── Reports & badges ─────────────────────────────────────────────────────────
export const ReportDTO = t.Object({
  targetType: t.Union([t.Literal('thread'), t.Literal('post'), t.Literal('user')]),
  targetId: t.Integer({ minimum: 1 }),
  reason: t.String({ minLength: 3, maxLength: 500 }),
});
export type ReportDTO = typeof ReportDTO.static;

export const ReportStatusDTO = t.Object({
  status: t.Union([t.Literal('open'), t.Literal('reviewed'), t.Literal('dismissed')]),
});
export type ReportStatusDTO = typeof ReportStatusDTO.static;

export const ReportQuery = t.Object({
  page: t.Numeric({ minimum: 1, default: 1 }),
  limit: t.Numeric({ minimum: 1, maximum: 100, default: 20 }),
  status: t.Optional(t.String()),
});

export const GrantBadgeDTO = t.Object({
  badgeKey: t.String({ minLength: 1, maxLength: 50 }),
});
export type GrantBadgeDTO = typeof GrantBadgeDTO.static;

// User payload stored in JWT
export interface JwtPayload {
  userId: number;
}
