import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery, dbGetOne } from '../db.js';
import { authMiddleware, createToken } from '../middleware/auth.js';
import { sendError, buildProfile } from '../middleware/validate.js';

const router = Router();

// POST /api/admin/login — 管理员登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, '请填写邮箱和密码');

    const user = await dbGetOne('SELECT * FROM users WHERE email = ? AND is_admin = 1', [email]);
    if (!user) return sendError(res, '管理员账号或密码错误');

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return sendError(res, '管理员账号或密码错误');

    const token = createToken(user);
    return res.json({ token, user: buildProfile(user) });
  } catch (e) {
    console.error('[admin] login error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// DELETE /api/admin/goods/:id — 管理员下架商品
router.delete('/goods/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.is_admin) return sendError(res, '无管理员权限', 403);

    const { reason } = req.body;
    if (!reason || !reason.trim()) return sendError(res, '请选择违规原因');

    const goods = await dbGetOne('SELECT id, seller_id, title, status FROM goods WHERE id = ?', [req.params.id]);
    if (!goods) return sendError(res, '商品不存在', 404);
    if (goods.status === 'sold') return sendError(res, '已售出商品无法下架');
    if (goods.status === 'removed') return sendError(res, '该商品已被下架');

    // 软删除：标记为已下架
    await dbQuery('UPDATE goods SET status = ? WHERE id = ?', ['removed', req.params.id]);

    // 发送系统通知私信给卖家
    const msgId = uuidv4();
    await dbQuery(
      'INSERT INTO messages (id, from_id, to_id, content, created_at) VALUES (?, ?, ?, ?, NOW())',
      [msgId, req.user.id, goods.seller_id,
        `【官方通知】您发布的商品「${goods.title}」因违规已被下架。\n违规原因：${reason}\n如有疑问请联系管理员。`
      ]
    );

    return res.json({ message: '商品已下架并通知卖家' });
  } catch (e) {
    console.error('[admin] delete goods error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

export default router;
