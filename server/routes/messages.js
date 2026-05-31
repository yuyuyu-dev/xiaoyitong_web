import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery, dbGetOne } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendError } from '../middleware/validate.js';

const router = Router();

// GET /api/messages/conversations — 会话列表
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const rows = await dbQuery(
      `SELECT m.*, uf.nickname AS from_nickname, ut.nickname AS to_nickname
       FROM messages m
       JOIN users uf ON m.from_id = uf.id
       JOIN users ut ON m.to_id = ut.id
       WHERE m.id IN (
         SELECT id FROM (
           SELECT id, ROW_NUMBER() OVER (
             PARTITION BY LEAST(from_id, to_id), GREATEST(from_id, to_id)
             ORDER BY created_at DESC
           ) AS rn
           FROM messages
           WHERE from_id = ? OR to_id = ?
         ) ranked WHERE rn = 1
       )
       ORDER BY m.created_at DESC`,
      [req.user.id, req.user.id]
    );

    const list = rows.map(m => {
      const otherId = m.from_id === req.user.id ? m.to_id : m.from_id;
      const otherName = m.from_id === req.user.id ? m.to_nickname : m.from_nickname;
      return { otherId, otherName, lastMessage: m.content, lastTime: m.created_at };
    });
    return res.json(list);
  } catch (e) {
    console.error('[messages] conversation list error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// GET /api/messages/conversation/:otherId — 与某人的聊天记录
router.get('/conversation/:otherId', authMiddleware, async (req, res) => {
  try {
    const otherId = req.params.otherId;
    const rows = await dbQuery(
      `SELECT m.*, uf.nickname AS from_nickname, ut.nickname AS to_nickname
       FROM messages m
       JOIN users uf ON m.from_id = uf.id
       JOIN users ut ON m.to_id = ut.id
       WHERE (m.from_id = ? AND m.to_id = ?) OR (m.from_id = ? AND m.to_id = ?)
       ORDER BY m.created_at ASC`,
      [req.user.id, otherId, otherId, req.user.id]
    );

    return res.json(rows.map(row => ({
      id: row.id,
      from_id: row.from_id,
      to_id: row.to_id,
      content: row.content,
      created_at: row.created_at,
      from: { id: row.from_id, nickname: row.from_nickname },
      to: { id: row.to_id, nickname: row.to_nickname }
    })));
  } catch (e) {
    console.error('[messages] conversation error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// POST /api/messages — 发送消息
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { to_id, content } = req.body;
    if (!to_id || !content) return sendError(res, '请填写完整消息内容');
    if (content.length > 5000) return sendError(res, '消息内容不能超过 5000 个字符');

    const recipient = await dbGetOne('SELECT id FROM users WHERE id = ?', [to_id]);
    if (!recipient) return sendError(res, '对方不存在');

    const messageId = uuidv4();
    await dbQuery(
      'INSERT INTO messages (id, from_id, to_id, content, created_at) VALUES (?, ?, ?, ?, NOW())',
      [messageId, req.user.id, to_id, content]
    );
    return res.json({ id: messageId, from_id: req.user.id, to_id, content, created_at: new Date().toISOString() });
  } catch (e) {
    console.error('[messages] send error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// GET /api/messages/unread-count — 未读消息数
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const user = await dbGetOne('SELECT last_read_at FROM users WHERE id = ?', [req.user.id]);
    const lastRead = user?.last_read_at;
    let count = 0;
    if (lastRead) {
      const rows = await dbQuery(
        'SELECT COUNT(*) AS cnt FROM messages WHERE to_id = ? AND created_at > ?',
        [req.user.id, lastRead]
      );
      count = rows[0]?.cnt || 0;
    } else {
      const rows = await dbQuery(
        'SELECT COUNT(*) AS cnt FROM messages WHERE to_id = ?',
        [req.user.id]
      );
      count = rows[0]?.cnt || 0;
    }
    return res.json({ count });
  } catch (e) {
    console.error('[messages] unread-count error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// POST /api/messages/mark-read — 标记已读（更新 last_read_at）
router.post('/mark-read', authMiddleware, async (req, res) => {
  try {
    await dbQuery('UPDATE users SET last_read_at = NOW() WHERE id = ?', [req.user.id]);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[messages] mark-read error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

export default router;
