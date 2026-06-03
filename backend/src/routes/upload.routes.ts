import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware.js';
import { userRepository } from '../repositories/user.repository.js';
import { storage } from '../services/storage.service.js';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

// Buffer the file in memory so the active storage driver (local disk or CDN) decides where it lands.
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for content images
});

// Wrap a multer middleware so multer/validation errors return 400 instead of hitting the error handler as 500.
const runMulter = (mw: RequestHandler): RequestHandler => (req, res, next) => {
  mw(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: `Upload error: ${err.message}` });
      return;
    }
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
      return;
    }
    next();
  });
};

const router = Router();

router.post(
  '/avatar',
  authenticate,
  runMulter(avatarUpload.single('avatar')),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const { url } = await storage.upload(
        { buffer: req.file.buffer, originalname: req.file.originalname, mimetype: req.file.mimetype },
        'avatar'
      );
      await userRepository.update(req.user!.userId, { avatar: url });
      res.status(200).json({ url });
    } catch (error) {
      next(error);
    }
  }
);

// Upload content image (for markdown editor paste/drop) — authenticated only
router.post(
  '/image',
  authenticate,
  runMulter(imageUpload.single('image')),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const { url } = await storage.upload(
        { buffer: req.file.buffer, originalname: req.file.originalname, mimetype: req.file.mimetype },
        'img'
      );
      res.status(200).json({ url });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
