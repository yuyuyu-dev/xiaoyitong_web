import jwt from 'jsonwebtoken';
import { dbGetOne } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;

export function createToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登录，请先登录' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await dbGetOne(
      'SELECT id, email, nickname, school, bio, avatar_url, is_admin, created_at FROM users WHERE id = ?',
      [payload.sub]
    );
    if (!user) return res.status(401).json({ error: '用户不存在' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) { req.user = null; return next(); }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    dbGetOne('SELECT id, email, nickname, school, bio, avatar_url, is_admin, created_at FROM users WHERE id = ?', [payload.sub])
      .then(user => { req.user = user; next(); })
      .catch(() => { req.user = null; next(); });
  } catch {
    req.user = null;
    next();
  }
}
