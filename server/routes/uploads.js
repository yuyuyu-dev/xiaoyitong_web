import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import { sendError } from '../middleware/validate.js';

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) { cb(null, uploadDir); },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('仅支持 JPG/PNG/WebP/GIF 图片'));
    }
    cb(null, true);
  }
});

const router = Router();

// POST /api/upload — 上传图片（单数，匹配前端）
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return sendError(res, '未上传文件');
  return res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;
