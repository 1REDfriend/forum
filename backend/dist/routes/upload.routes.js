import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middlewares/auth.middleware.js';
import { userRepository } from '../repositories/user.repository.js';
// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, uniqueName);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
};
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});
const router = Router();
router.post('/avatar', authenticate, (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            res.status(400).json({ error: `Upload error: ${err.message}` });
            return;
        }
        else if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        next();
    });
}, async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const userId = req.user.userId;
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3636}`;
        const avatarUrl = `${backendUrl}/uploads/${req.file.filename}`;
        // Update user avatar in DB
        await userRepository.update(userId, { avatar: avatarUrl });
        res.status(200).json({ url: avatarUrl });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=upload.routes.js.map