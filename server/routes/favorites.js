import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery, dbGetOne } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendError, buildGoods } from '../middleware/validate.js';

const router = Router();

const FAV_JOIN = 'SELECT f.id AS favorite_id, g.id AS goods_id, g.seller_id, g.title, g.price, g.category, g.`condition`, g.location, g.description, g.image_url, g.hot, g.status, g.created_at, u.nickname AS seller_nickname, u.school AS seller_school, u.bio AS seller_bio, u.avatar_url AS seller_avatar_url FROM favorites f JOIN goods g ON f.goods_id = g.id JOIN users u ON g.seller_id = u.id';

// GET /api/favorites — 当前用户的收藏列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rows = await dbQuery(`${FAV_JOIN} WHERE f.user_id = ? ORDER BY f.created_at DESC`, [req.user.id]);
    return res.json(rows.map(row => ({
      id: row.favorite_id,
      goods_id: row.goods_id,
      goods: buildGoods({ ...row, id: row.goods_id })
    })));
  } catch (e) {
    console.error('[favorites] list error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// POST /api/favorites/:goodsId — toggle 收藏
router.post('/:goodsId', authMiddleware, async (req, res) => {
  try {
    const { goodsId } = req.params;
    const existing = await dbGetOne('SELECT id FROM favorites WHERE user_id = ? AND goods_id = ?', [req.user.id, goodsId]);
    if (existing) {
      await dbQuery('DELETE FROM favorites WHERE id = ?', [existing.id]);
      return res.json({ action: 'removed' });
    }
    await dbQuery('INSERT INTO favorites (id, user_id, goods_id, created_at) VALUES (?, ?, ?, NOW())', [uuidv4(), req.user.id, goodsId]);
    return res.json({ action: 'added' });
  } catch (e) {
    console.error('[favorites] toggle error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// GET /api/users/:userId/favorites — 兼容旧路径
export function userFavoritesHandler() {
  const r = Router();
  r.get('/:userId/favorites', authMiddleware, async (req, res) => {
    try {
      if (req.user.id !== req.params.userId) return sendError(res, '无权查看该用户收藏', 403);
      const rows = await dbQuery(`${FAV_JOIN} WHERE f.user_id = ? ORDER BY f.created_at DESC`, [req.params.userId]);
      return res.json(rows.map(row => ({
        id: row.favorite_id,
        goods_id: row.goods_id,
        goods: buildGoods({ ...row, id: row.goods_id })
      })));
    } catch (e) {
      console.error('[favorites] user favorites error:', e);
      return sendError(res, '服务器内部错误', 500);
    }
  });
  return r;
}

export default router;
