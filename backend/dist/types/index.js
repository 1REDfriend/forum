import { z } from 'zod';
export const RegisterDTOSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(6).max(100),
});
export const LoginDTOSchema = z.object({
    email: z.string().email(),
    password: z.string().max(100),
});
export const GoogleAuthDTOSchema = z.object({
    idToken: z.string(),
});
export const ForgotPasswordDTOSchema = z.object({
    email: z.string().email(),
});
export const ResetPasswordDTOSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(6).max(100),
});
export const CreateForumDTOSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
});
export const UpdateForumDTOSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
}).refine((data) => data.name !== undefined || data.description !== undefined, {
    message: 'At least one field (name or description) must be provided',
});
export const CreateThreadDTOSchema = z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(50000),
    forumId: z.number().int().positive(),
});
export const UpdateThreadDTOSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(50000).optional(),
}).refine((data) => data.title !== undefined || data.content !== undefined, {
    message: 'At least one field (title or content) must be provided',
});
export const CreatePostDTOSchema = z.object({
    content: z.string().min(1).max(50000),
    threadId: z.number().int().positive(),
});
export const UpdatePostDTOSchema = z.object({
    content: z.string().min(1).max(50000),
});
export const UpdateUserDTOSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    avatar: z.string().optional(),
}).refine((data) => data.name !== undefined || data.avatar !== undefined, {
    message: 'At least one field (name or avatar) must be provided',
});
export const PaginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=index.js.map