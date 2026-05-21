import { z } from 'zod';

export const RegisterDTOSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});
export type RegisterDTO = z.infer<typeof RegisterDTOSchema>;

export const LoginDTOSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginDTO = z.infer<typeof LoginDTOSchema>;

export const GoogleAuthDTOSchema = z.object({
  idToken: z.string(),
});
export type GoogleAuthDTO = z.infer<typeof GoogleAuthDTOSchema>;

export const CreateForumDTOSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});
export type CreateForumDTO = z.infer<typeof CreateForumDTOSchema>;

export const CreateThreadDTOSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  forumId: z.number().int().positive(),
});
export type CreateThreadDTO = z.infer<typeof CreateThreadDTOSchema>;

export const CreatePostDTOSchema = z.object({
  content: z.string().min(1),
  threadId: z.number().int().positive(),
});
export type CreatePostDTO = z.infer<typeof CreatePostDTOSchema>;

// User payload stored in JWT
export interface JwtPayload {
  userId: number;
}
