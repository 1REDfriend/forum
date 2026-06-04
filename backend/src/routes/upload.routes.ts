import { Elysia, t } from 'elysia';
import { auth } from '../http/auth.js';
import { storage } from '../services/storage.service.js';
import { userRepository } from '../repositories/user.repository.js';

// image/jpg isn't a real MIME but the old multer filter accepted it — keep it for parity.
const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export const uploadRoutes = new Elysia({ prefix: '/upload', tags: ['Upload'] })
  .use(auth)
  .guard({ auth: true }, (app) =>
    app
      // Avatar (5MB) — persists the URL on the user record
      .post(
        '/avatar',
        async ({ user, body }) => {
          const file = body.avatar;
          const buffer = Buffer.from(await file.arrayBuffer());
          const { url } = await storage.upload(
            { buffer, originalname: file.name, mimetype: file.type },
            'avatar',
          );
          await userRepository.update(user.userId, { avatar: url });
          return { url };
        },
        { body: t.Object({ avatar: t.File({ type: IMAGE_MIMES, maxSize: '5m' }) }) },
      )
      // Content image (10MB) — for markdown editor paste/drop
      .post(
        '/image',
        async ({ body }) => {
          const file = body.image;
          const buffer = Buffer.from(await file.arrayBuffer());
          const { url } = await storage.upload(
            { buffer, originalname: file.name, mimetype: file.type },
            'img',
          );
          return { url };
        },
        { body: t.Object({ image: t.File({ type: IMAGE_MIMES, maxSize: '10m' }) }) },
      ),
  );
