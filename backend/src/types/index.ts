import { z } from 'zod';

export const RegisterDTOSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});
export type RegisterDTO = z.infer<typeof RegisterDTOSchema>;

export const LoginDTOSchema = z.object({
  email: z.string().email(),
  password: z.string().max(100),
});
export type LoginDTO = z.infer<typeof LoginDTOSchema>;

export const GoogleAuthDTOSchema = z.object({
  idToken: z.string(),
});
export type GoogleAuthDTO = z.infer<typeof GoogleAuthDTOSchema>;

export const ForgotPasswordDTOSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordDTOSchema>;

export const ResetPasswordDTOSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6).max(100),
});
export type ResetPasswordDTO = z.infer<typeof ResetPasswordDTOSchema>;

export const CreateForumDTOSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});
export type CreateForumDTO = z.infer<typeof CreateForumDTOSchema>;

export const UpdateForumDTOSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
}).refine((data) => data.name !== undefined || data.description !== undefined, {
  message: 'At least one field (name or description) must be provided',
});
export type UpdateForumDTO = z.infer<typeof UpdateForumDTOSchema>;

export const CreateThreadDTOSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  forumId: z.number().int().positive(),
});
export type CreateThreadDTO = z.infer<typeof CreateThreadDTOSchema>;

export const UpdateThreadDTOSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
}).refine((data) => data.title !== undefined || data.content !== undefined, {
  message: 'At least one field (title or content) must be provided',
});
export type UpdateThreadDTO = z.infer<typeof UpdateThreadDTOSchema>;

export const CreatePostDTOSchema = z.object({
  content: z.string().min(1).max(50000),
  threadId: z.number().int().positive(),
});
export type CreatePostDTO = z.infer<typeof CreatePostDTOSchema>;

export const UpdatePostDTOSchema = z.object({
  content: z.string().min(1).max(50000),
});
export type UpdatePostDTO = z.infer<typeof UpdatePostDTOSchema>;

export const UpdateUserDTOSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().max(2000).optional(),
  banner: z.string().max(2000).optional(),
  bio: z.string().max(500).optional(),
}).refine(
  (data) =>
    data.name !== undefined ||
    data.avatar !== undefined ||
    data.banner !== undefined ||
    data.bio !== undefined,
  { message: 'At least one field must be provided' },
);
export type UpdateUserDTO = z.infer<typeof UpdateUserDTOSchema>;

// ─── Tier (rank) — admin-assigned, separate from role ────────────────────────
export const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;
export type Tier = (typeof TIERS)[number];

export const UpdateUserTierDTOSchema = z.object({
  tier: z.enum(TIERS),
});
export type UpdateUserTierDTO = z.infer<typeof UpdateUserTierDTOSchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// User payload stored in JWT
export interface JwtPayload {
  userId: number;
}
