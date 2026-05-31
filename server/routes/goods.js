import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery, dbGetOne } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateLength, validatePrice, validateLimit, sendError, buildGoods } from '../middleware/validate.js';

const router = Router();

const GOODS_JOIN = 'SELECT g.id, g.seller_id, g.title, g.price, g.category, g.`condition`, g.location, g.description, g.image_url, g.hot, g.status, g.created_at, u.nickname AS seller_nickname, u.school AS seller_school, u.bio AS seller_bio, u.avatar_url AS seller_avatar_url FROM goods g JOIN users u ON g.seller_id = u.id';

// GET /api/goods/latest
router.get('/latest', async (req, res) => {
  try {
    const limit = validateLimit(req.query.limit, 4, 20);
    const rows = await dbQuery(`${GOODS_JOIN} WHERE g.status = 'available' ORDER BY g.created_at DESC LIMIT ?`, [limit]);
    return res.json(rows.map(buildGoods));
  } catch (e) {
    console.error('[goods] latest error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// GET /api/goods
router.get('/', async (req, res) => {
  try {
    const { keyword = '', category = '', condition = '', sort = 'new', userId = '' } = req.query;
    const limit = validateLimit(req.query.limit, 40, 100);
    const where = [];
    const params = [];

    // 公开列表只显示在售商品；查看某用户自己的商品时显示全部
    if (!userId) {
      where.push('g.status = ?');
      params.push('available');
    }

    if (keyword) {
      where.push('(g.title LIKE ? OR g.description LIKE ? OR g.location LIKE ?)');
      const q = `%${keyword}%`;
      params.push(q, q, q);
    }
    if (category && category !== '全部') {
      where.push('g.category = ?');
      params.push(category);
    }
    if (condition && condition !== '全部') {
      where.push('g.`condition` = ?');
      params.push(condition);
    }
    if (userId) {
      where.push('g.seller_id = ?');
      params.push(userId);
    }

    const orderBy = sort === 'priceAsc'
      ? 'g.price ASC'
      : sort === 'priceDesc'
        ? 'g.price DESC'
        : sort === 'hot'
          ? 'g.hot DESC'
          : 'g.created_at DESC';

    const sql = `${GOODS_JOIN} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${orderBy} LIMIT ?`;
    const rows = await dbQuery(sql, [...params, limit]);
    return res.json(rows.map(buildGoods));
  } catch (e) {
    console.error('[goods] list error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// GET /api/goods/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await dbGetOne(`${GOODS_JOIN} WHERE g.id = ?`, [req.params.id]);
    if (!row) return sendError(res, '商品不存在', 404);
    return res.json(buildGoods(row));
  } catch (e) {
    console.error('[goods] get by id error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// POST /api/goods/:id/hot — 增加热度
router.post('/:id/hot', async (req, res) => {
  try {
    const { delta } = req.body;
    const n = Number(delta);
    if (!Number.isFinite(n) || n <= 0 || n > 10) return sendError(res, '无效的热度值');
    await dbQuery('UPDATE goods SET hot = hot + ? WHERE id = ?', [Math.floor(n), req.params.id]);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[goods] hot error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// POST /api/goods
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, price, category, condition, location, description, image_url } = req.body;
    if (!title || !price || !category || !condition || !location || !description) {
      return sendError(res, '请填写完整的商品信息');
    }
    const titleErr = validateLength(title, '标题', 1, 200);
    if (titleErr) return sendError(res, titleErr);
    const priceErr = validatePrice(price);
    if (priceErr) return sendError(res, priceErr);
    const descErr = validateLength(description, '描述', 1, 5000);
    if (descErr) return sendError(res, descErr);

    const goodsId = uuidv4();
    await dbQuery(
      'INSERT INTO goods (id, seller_id, title, price, category, `condition`, location, description, image_url, hot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [goodsId, req.user.id, title, Number(price), category, condition, location, description, image_url || '', 0]
    );
    const row = await dbGetOne(`${GOODS_JOIN} WHERE g.id = ?`, [goodsId]);
    return res.json(buildGoods(row));
  } catch (e) {
    console.error('[goods] create error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// DELETE /api/goods/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const goods = await dbGetOne('SELECT seller_id FROM goods WHERE id = ?', [req.params.id]);
    if (!goods) return sendError(res, '商品不存在', 404);
    if (goods.seller_id !== req.user.id) return sendError(res, '只能删除自己的商品', 403);
    await dbQuery('DELETE FROM goods WHERE id = ?', [req.params.id]);
    return res.json({ message: '已删除' });
  } catch (e) {
    console.error('[goods] delete error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// GET /api/users/:userId/goods (mounted separately)
export function userGoodsHandler() {
  const r = Router();
  r.get('/:userId/goods', async (req, res) => {
    try {
      const rows = await dbQuery(`${GOODS_JOIN} WHERE g.seller_id = ? ORDER BY g.created_at DESC`, [req.params.userId]);
      return res.json(rows.map(buildGoods));
    } catch (e) {
      console.error('[goods] user goods error:', e);
      return sendError(res, '服务器内部错误', 500);
    }
  });
  return r;
}

export default router;
