import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { dbQuery, dbClose } from './server/db.js';
import authRouter from './server/routes/auth.js';
import goodsRouter, { userGoodsHandler } from './server/routes/goods.js';
import favoritesRouter, { userFavoritesHandler } from './server/routes/favorites.js';
import profilesRouter, { publicUserHandler } from './server/routes/profiles.js';
import messagesRouter from './server/routes/messages.js';
import uploadsRouter from './server/routes/uploads.js';
import statsRouter from './server/routes/stats.js';
import transactionsRouter from './server/routes/transactions.js';
import adminRouter from './server/routes/admin.js';

// ── 启动前校验必需环境变量 ──
if (!process.env.JWT_SECRET) {
  console.error('');
  console.error('错误：JWT_SECRET 未设置');
  console.error('');
  console.error('请执行以下步骤：');
  console.error('  1. 复制配置文件：  cp .env.example .env');
  console.error('  2. 生成密钥：      node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('  3. 把生成的密钥填入 .env 的 JWT_SECRET= 后面');
  console.error('  4. 同时填入你的 MySQL 密码到 DB_PASSWORD=');
  console.error('');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);

// ── 安全中间件 ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"]
    }
  }
}));

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : false,
  credentials: true
}));

// ── 通用中间件 ──
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── 速率限制 ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: '请求过于频繁，请稍后再试' }
});
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: '请求过于频繁，请稍后再试' }
});

// ── 静态文件 ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { dotfiles: 'deny' }));
app.use(express.static(__dirname, {
  index: 'splash.html',
  dotfiles: 'deny'
}));

// ── API 路由 ──
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/goods', generalLimiter, goodsRouter);
app.use('/api/favorites', generalLimiter, favoritesRouter);
app.use('/api/profiles', generalLimiter, profilesRouter);
app.use('/api/messages', generalLimiter, messagesRouter);
app.use('/api/upload', generalLimiter, uploadsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/transactions', generalLimiter, transactionsRouter);
app.use('/api/admin', authLimiter, adminRouter);

// 兼容旧路径
app.use('/api/users', generalLimiter, userGoodsHandler());
app.use('/api/users', generalLimiter, userFavoritesHandler());
app.use('/api/users', generalLimiter, publicUserHandler());

// ── 健康检查 ──
app.get('/health', async (req, res) => {
  try {
    await dbQuery('SELECT 1');
    res.json({ ok: true, db: true });
  } catch {
    res.status(503).json({ ok: false, db: false });
  }
});

// ── 清理过期注册码 ──
dbQuery('DELETE FROM register_codes WHERE expires_at < NOW()')
  .then(() => console.log('[init] 已清理过期注册码'))
  .catch(e => console.warn('[init] 清理注册码失败:', e.message));

// ── 启动服务 ──
const server = app.listen(port, () => {
  console.log(`服务已启动：http://localhost:${port}`);
  console.log(`环境：${process.env.NODE_ENV || 'development'}`);
});

// ── 优雅关闭 ──
function shutdown(signal) {
  console.log(`\n收到 ${signal}，正在关闭...`);
  server.close(() => {
    dbClose().then(() => {
      console.log('已关闭所有连接');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
