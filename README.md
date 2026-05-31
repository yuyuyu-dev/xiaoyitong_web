# 校易通 · 校园二手交易平台

面向大学生的校园二手交易平台，支持商品发布、搜索筛选、收藏、私信沟通。

## 技术栈

- **前端：** 原生 HTML/CSS/JavaScript (ES Modules)，无框架依赖
- **后端：** Node.js + Express
- **数据库：** MySQL 8+
- **认证：** JWT + bcryptjs
- **邮件：** Nodemailer (可选，用于注册验证码)

## 快速上手

### 1. 环境要求

- Node.js 18+
- MySQL 8+

### 2. 初始化数据库

```bash
mysql -u root -p < mysql_schema.sql
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入数据库连接信息和 JWT 密钥：

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=xiaoyitong
JWT_SECRET=your-secure-random-string-min-32-chars
```

### 4. 安装依赖并启动

```bash
npm install
npm start
```

访问 http://localhost:3000

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DB_HOST` | 是 | MySQL 主机地址 |
| `DB_PORT` | 是 | MySQL 端口 |
| `DB_USER` | 是 | MySQL 用户名 |
| `DB_PASSWORD` | 是 | MySQL 密码 |
| `DB_NAME` | 是 | 数据库名称 |
| `JWT_SECRET` | 是 | JWT 签名密钥（至少 32 字符） |
| `NODE_ENV` | 否 | `production` 或 `development`（默认） |
| `PORT` | 否 | 服务端口（默认 3000） |
| `CORS_ORIGINS` | 否 | 允许的跨域来源（逗号分隔） |
| `SMTP_HOST` | 否 | SMTP 服务器（注册验证码需要） |
| `SMTP_PORT` | 否 | SMTP 端口（默认 587） |
| `SMTP_USER` | 否 | SMTP 用户名 |
| `SMTP_PASS` | 否 | SMTP 密码 |
| `SMTP_FROM` | 否 | 发件人地址 |

## 项目结构

```
├── server.js              # 入口文件
├── server/
│   ├── db.js              # MySQL 连接池
│   ├── lib/
│   │   └── mailer.js      # 邮件发送
│   ├── middleware/
│   │   ├── auth.js        # JWT 认证中间件
│   │   └── validate.js    # 输入验证工具
│   └── routes/
│       ├── auth.js        # 注册/登录
│       ├── goods.js       # 商品 CRUD
│       ├── favorites.js   # 收藏管理
│       ├── profiles.js    # 用户资料
│       ├── messages.js    # 私信
│       ├── uploads.js     # 图片上传
│       └── stats.js       # 平台统计
├── api/                   # 前端 API 封装
├── pages/                 # 页面逻辑
├── utils/                 # 前端工具函数
├── css/                   # 样式文件
├── lib/                   # 前端公共库
├── uploads/               # 上传文件目录
├── mysql_schema.sql       # 数据库结构
├── .env.example           # 环境变量模板
└── .gitignore
```

## API 端点

### 认证
- `POST /api/auth/request-register-code` — 发送注册验证码
- `POST /api/auth/resend-register-code` — 重发验证码
- `POST /api/auth/confirm-register-code` — 确认验证码完成注册
- `POST /api/auth/login` — 登录
- `GET /api/auth/me` — 获取当前用户

### 商品
- `GET /api/goods` — 商品列表（支持 keyword/category/condition/sort/limit）
- `GET /api/goods/latest` — 最新商品
- `GET /api/goods/:id` — 商品详情
- `POST /api/goods` — 发布商品（需登录）
- `DELETE /api/goods/:id` — 删除商品（需登录）

### 收藏
- `GET /api/favorites` — 我的收藏（需登录）
- `POST /api/favorites/:goodsId` — 切换收藏状态（需登录）

### 用户资料
- `GET /api/profiles` — 当前用户资料（需登录）
- `GET /api/profiles/:userId` — 公开用户资料
- `PUT /api/profiles` — 更新资料（需登录）

### 私信
- `GET /api/messages/conversations` — 会话列表（需登录）
- `GET /api/messages/conversation/:otherId` — 聊天记录（需登录）
- `POST /api/messages` — 发送消息（需登录）

### 其他
- `POST /api/upload` — 上传图片（需登录）
- `GET /api/stats` — 平台统计
- `GET /health` — 健康检查

## 部署

### 使用 PM2

```bash
npm install -g pm2
pm2 start server.js --name xiaoyitong
pm2 save
pm2 startup
```

### 使用 Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## 安全特性

- JWT 认证，密钥缺失时拒绝启动
- Helmet 安全头
- CORS 白名单
- 速率限制（认证端点 15分钟/20次）
- 文件上传类型白名单（JPG/PNG/WebP/GIF）
- 服务端输入验证
- 静态文件 dotfiles 拒绝
- 优雅关闭处理
