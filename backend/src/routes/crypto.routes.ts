import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { validate } from '../http/validate.js';
import { cryptoKeysService } from '../services/cryptoKeys.service.js';

const UpsertKeysDTO = z.object({
  salt: z.string().min(8).max(512),
  identityPublicKey: z.string().min(20).max(16_000),
  agreementPublicKey: z.string().min(20).max(16_000),
  wrappedPrivateKeys: z.string().min(20).max(16_000),
  wrapIv: z.string().min(8).max(128),
});

export const cryptoRoutes = new Hono<AuthEnv>()
  .use('*', requireAuth)
  .get('/keys/me', async (c) => {
    const bundle = await cryptoKeysService.getMine(c.get('user').userId);
    return c.json({ keys: bundle });
  })
  .put('/keys/me', validate('json', UpsertKeysDTO), async (c) => {
    const result = await cryptoKeysService.upsertMine(c.get('user').userId, c.req.valid('json'));
    return c.json({ keys: result });
  })
  .get('/keys/:userId', async (c) => {
    const keys = await cryptoKeysService.getPublic(c.req.param('userId'));
    return c.json({ keys });
  });
