import { Router } from 'express';
import { dbQuery, dbGetOne } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateLength, sendError, buildProfile, buildPublicProfile } from '../middleware/validate.js';

const router = Router();

// GET /api/profiles — 当前登录用户资料
router.get('/', authMiddleware, (req, res) => {
  return res.json(buildProfile(req.user));
});

// GET /api/profiles/:userId — 公开用户资料（不含 email）
router.get('/:userId', async (req, res) => {
  try {
    const user = await dbGetOne(
      'SELECT id, email, nickname, school, bio, avatar_url, is_admin, created_at FROM users WHERE id = ?',
      [req.params.userId]
    );
    if (!user) return sendError(res, '用户不存在', 404);
    return res.json(buildPublicProfile(user));
  } catch (e) {
    console.error('[profiles] get error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// PUT /api/profiles — 更新当前用户资料
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { nickname, school, bio, avatar_url } = req.body;
    if (!nickname || !school) return sendError(res, '请填写昵称和学校');
    const nickErr = validateLength(nickname, '昵称', 1, 50);
    if (nickErr) return sendError(res, nickErr);
    const schoolErr = validateLength(school, '学校', 1, 50);
    if (schoolErr) return sendError(res, schoolErr);
    if (bio && bio.length > 500) return sendError(res, '简介不能超过 500 个字符');
    if (avatar_url && typeof avatar_url !== 'string') return sendError(res, '头像地址格式不正确');

    await dbQuery('UPDATE users SET nickname = ?, school = ?, bio = ?, avatar_url = ? WHERE id = ?', [
      nickname, school, bio || '', avatar_url || '', req.user.id
    ]);
    const user = await dbGetOne('SELECT id, email, nickname, school, bio, avatar_url, is_admin, created_at FROM users WHERE id = ?', [req.user.id]);
    return res.json(buildProfile(user));
  } catch (e) {
    console.error('[profiles] update error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// GET /api/users/:userId — 兼容旧路径（公开资料）
export function publicUserHandler() {
  const r = Router();
  r.get('/:userId', async (req, res) => {
    try {
      const user = await dbGetOne(
        'SELECT id, email, nickname, school, bio, avatar_url, is_admin, created_at FROM users WHERE id = ?',
        [req.params.userId]
      );
      if (!user) return sendError(res, '用户不存在', 404);
      return res.json(buildPublicProfile(user));
    } catch (e) {
      console.error('[profiles] public user error:', e);
      return sendError(res, '服务器内部错误', 500);
    }
  });
  return r;
}

export default router;
