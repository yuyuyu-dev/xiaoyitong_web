import { Router } from 'express';
import { dbQuery } from '../db.js';
import { sendError } from '../middleware/validate.js';

const router = Router();

// GET /api/stats
router.get('/', async (req, res) => {
  try {
    const [goods] = await dbQuery('SELECT COUNT(*) AS count FROM goods');
    const [users] = await dbQuery('SELECT COUNT(*) AS count FROM users');
    const [deals] = await dbQuery('SELECT COUNT(*) AS count FROM transactions');
    let favoritesCount = 0;
    if (req.query.userId) {
      const rows = await dbQuery('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?', [req.query.userId]);
      favoritesCount = rows[0]?.count || 0;
    }
    return res.json({
      goodsCount: goods.count,
      userCount: users.count,
      dealsCount: deals.count,
      favoritesCount
    });
  } catch (e) {
    console.error('[stats] error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

export default router;
