import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { dbQuery, dbGetOne } from '../db.js';
import { authMiddleware, createToken } from '../middleware/auth.js';
import { validateEmail, validateLength, sendError, buildProfile } from '../middleware/validate.js';
import { sendVerificationCode } from '../lib/mailer.js';

const router = Router();

// POST /api/auth/request-register-code
router.post('/request-register-code', async (req, res) => {
  try {
    const { email, password, nickname, school } = req.body;
    if (!email || !password || !nickname || !school) return sendError(res, '请完整填写注册信息');
    if (!validateEmail(email)) return sendError(res, '邮箱格式不正确');
    if (password.length < 6) return sendError(res, '密码至少 6 位');
    if (password.length > 128) return sendError(res, '密码不能超过 128 位');
    const nickErr = validateLength(nickname, '昵称', 1, 50);
    if (nickErr) return sendError(res, nickErr);
    const schoolErr = validateLength(school, '学校', 1, 50);
    if (schoolErr) return sendError(res, schoolErr);

    const existingUser = await dbGetOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) return sendError(res, '该邮箱已注册');

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const passwordHash = await bcrypt.hash(password, 10);
    await dbQuery('DELETE FROM register_codes WHERE email = ?', [email]);
    await dbQuery(
      'INSERT INTO register_codes (id, email, code, password_hash, nickname, school, expires_at) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [uuidv4(), email, code, passwordHash, nickname, school]
    );

    await sendVerificationCode(email, code);
    return res.json({ message: '验证码已发送，请查看邮箱。' });
  } catch (e) {
    console.error('[auth] request-register-code error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// POST /api/auth/resend-register-code
router.post('/resend-register-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, '请填写邮箱');

    const row = await dbGetOne(
      'SELECT id, password_hash, nickname, school FROM register_codes WHERE email = ? ORDER BY expires_at DESC LIMIT 1',
      [email]
    );
    if (!row) return sendError(res, '请先发送验证码');

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await dbQuery('UPDATE register_codes SET code = ?, expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?', [code, row.id]);

    await sendVerificationCode(email, code);
    return res.json({ message: '验证码已重新发送，请查看邮箱。' });
  } catch (e) {
    console.error('[auth] resend-register-code error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// POST /api/auth/confirm-register-code
router.post('/confirm-register-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return sendError(res, '请填写邮箱和验证码');

    const codeRow = await dbGetOne(
      'SELECT * FROM register_codes WHERE email = ? AND code = ? AND expires_at >= NOW() ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );
    if (!codeRow) return sendError(res, '验证码不正确或已过期');

    const existingUser = await dbGetOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) return sendError(res, '该邮箱已注册');

    const userId = uuidv4();
    await dbQuery(
      'INSERT INTO users (id, email, password_hash, nickname, school, bio, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [userId, email, codeRow.password_hash, codeRow.nickname, codeRow.school, '', '']
    );
    await dbQuery('DELETE FROM register_codes WHERE email = ?', [email]);

    const token = createToken({ id: userId });
    return res.json({
      token,
      user: { id: userId, email, nickname: codeRow.nickname, school: codeRow.school, bio: '', avatar_url: '' }
    });
  } catch (e) {
    console.error('[auth] confirm-register-code error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, '请填写邮箱和密码');

    const user = await dbGetOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return sendError(res, '邮箱或密码错误');

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return sendError(res, '邮箱或密码错误');

    const token = createToken(user);
    return res.json({ token, user: buildProfile(user) });
  } catch (e) {
    console.error('[auth] login error:', e);
    return sendError(res, '服务器内部错误', 500);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  return res.json(buildProfile(req.user));
});

export default router;
