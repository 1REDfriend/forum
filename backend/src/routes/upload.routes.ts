import { Hono } from 'hono';
import { requireAuth, type AuthEnv } from '../http/auth.js';
import { storage } from '../services/storage.service.js';
import { userRepository } from '../repositories/user.repository.js';

// image/jpg isn't a real MIME but the old multer filter accepted it — keep it for parity.
const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/** Validate a multipart image field: presence, MIME whitelist, size cap. */
function checkImage(value: unknown, maxBytes: number): File | { error: string } {
  if (!(value instanceof File)) return { error: 'Validation Error' };
  if (!IMAGE_MIMES.includes(value.type)) return { error: 'Validation Error' };
  if (value.size > maxBytes) return { error: 'Validation Error' };
  return value;
}

export const uploadRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  // Avatar (5MB) — persists the URL on the user record
  .post('/avatar', async (c) => {
    const body = await c.req.parseBody();
    const file = checkImage(body['avatar'], 5 * 1024 * 1024);
    if (!(file instanceof File)) return c.json(file, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await storage.upload(
      { buffer, originalname: file.name, mimetype: file.type },
      'avatar',
    );
    await userRepository.update(c.get('user').userId, { avatar: url });
    return c.json({ url });
  })
  // Content image (10MB) — for markdown editor paste/drop
  .post('/image', async (c) => {
    const body = await c.req.parseBody();
    const file = checkImage(body['image'], 10 * 1024 * 1024);
    if (!(file instanceof File)) return c.json(file, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await storage.upload(
      { buffer, originalname: file.name, mimetype: file.type },
      'img',
    );
    return c.json({ url });
  });
