import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';

type Target = 'json' | 'query' | 'param' | 'form';

/**
 * zValidator with the app's error contract: 400 `{ error: "Validation Error" }`,
 * plus zod issue details outside production (mirrors the old Elysia handler).
 */
export const validate = <Tgt extends Target, T extends ZodType>(target: Tgt, schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const body: { error: string; details?: unknown } = { error: 'Validation Error' };
      if (process.env.NODE_ENV !== 'production') body.details = result.error.issues;
      return c.json(body, 400);
    }
  });
