import { z } from 'zod';
export declare const RegisterDTOSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type RegisterDTO = z.infer<typeof RegisterDTOSchema>;
export declare const LoginDTOSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type LoginDTO = z.infer<typeof LoginDTOSchema>;
export declare const GoogleAuthDTOSchema: z.ZodObject<{
    idToken: z.ZodString;
}, z.core.$strip>;
export type GoogleAuthDTO = z.infer<typeof GoogleAuthDTOSchema>;
export declare const ForgotPasswordDTOSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordDTOSchema>;
export declare const ResetPasswordDTOSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type ResetPasswordDTO = z.infer<typeof ResetPasswordDTOSchema>;
export declare const CreateForumDTOSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateForumDTO = z.infer<typeof CreateForumDTOSchema>;
export declare const UpdateForumDTOSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateForumDTO = z.infer<typeof UpdateForumDTOSchema>;
export declare const CreateThreadDTOSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    forumId: z.ZodNumber;
}, z.core.$strip>;
export type CreateThreadDTO = z.infer<typeof CreateThreadDTOSchema>;
export declare const UpdateThreadDTOSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateThreadDTO = z.infer<typeof UpdateThreadDTOSchema>;
export declare const CreatePostDTOSchema: z.ZodObject<{
    content: z.ZodString;
    threadId: z.ZodNumber;
}, z.core.$strip>;
export type CreatePostDTO = z.infer<typeof CreatePostDTOSchema>;
export declare const UpdatePostDTOSchema: z.ZodObject<{
    content: z.ZodString;
}, z.core.$strip>;
export type UpdatePostDTO = z.infer<typeof UpdatePostDTOSchema>;
export declare const UpdateUserDTOSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateUserDTO = z.infer<typeof UpdateUserDTOSchema>;
export declare const PaginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export interface JwtPayload {
    userId: number;
}
//# sourceMappingURL=index.d.ts.map