import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery, dbGetOne } from '../db.js';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendError } from '../middleware/validate.js';

const router = Router();

const TX_JOIN = `
  SELECT t.id, t.goods_id, t.buyer_id, t.seller_id, t.price, t.status, t.created_at,
         g.title AS goods_title, g.image_url AS goods_image_url, g.category AS goods_category,
         ub.nickname AS buyer_nickname, us.nickname AS seller_nickname
  FROM transactions t
  JOIN goods g ON t.goods_id = g.id
  JOIN users ub ON t.buyer_id = ub.id
  JOIN users us ON t.seller_id = us.id
`;

function buildTx(row) {
  return {
    id: row.id,
    goods_id: row.goods_id,
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    price: Number(row.price),
    status: row.status,
    created_at: row.created_at,
    goods: {
      id: row.goods_id,
      title: row.goods_title,
      image_url: row.goods_image_url,
      category: row.goods_category
    },
    buyer: { id: row.buyer_id, nickname: row.buyer_nickname },
    seller: { id: row.seller_id, nickname: row.seller_nickname }
  };
}

// POST /api/transactions — 购买商品
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.is_admin) return sendError(res, '管理员账号无法购买商品', 403);
  const { goods_id } = req.body;
  if (!goods_id) return sendError(res, '缺少商品ID');

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 锁定商品行
    const [rows] = await conn.query('SELECT id, seller_id, price, status FROM goods WHERE id = ? FOR UPDATE', [goods_id]);
    const goods = rows[0];
    if (!goods) { await conn.rollback(); return sendError(res, '商品不存在', 404); }
    if (goods.status !== 'available') { await conn.rollback(); return sendError(res, '该商品已售出'); }
    if (goods.seller_id === req.user.id) { await conn.rollback(); return sendError(res, '不能购买自己的商品'); }

    const txId = uuidv4();
    await conn.query(
      'INSERT INTO transactions (id, goods_id, buyer_id, seller_id, price, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [txId, goods_id, req.user.id, goods.seller_id, goods.price, 'completed']
    );
    await conn.query('UPDATE goods SET status = ? WHERE id = ?', ['sold', goods_id]);

    await conn.commit();

    const tx = await dbGetOne(`${TX_JOIN} WHERE t.id = ?`, [txId]);
    return res.json(buildTx(tx));
  } catch (e) {
    if (conn) await conn.rollback().catch(() => {});
    console.error('[transactions] buy error:', e);
    return sendError(res, '服务器内部错误', 500);
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/transactions/bought — 我买到的
router.get('/bought', authMiddleware, async (req, res) => {
  try {
    const rows = await dbQuery(`${TX_JOIN} WHERE t.buyer_id = ? ORDER BY t.created_at DESC`, [req.user.id]);
    return res.json(rows.map(buildTx));
  } catch (e) {
    console.error('[transactions] bought error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// GET /api/transactions/sold — 我卖出的
router.get('/sold', authMiddleware, async (req, res) => {
  try {
    const rows = await dbQuery(`${TX_JOIN} WHERE t.seller_id = ? ORDER BY t.created_at DESC`, [req.user.id]);
    return res.json(rows.map(buildTx));
  } catch (e) {
    console.error('[transactions] sold error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

export default router;
