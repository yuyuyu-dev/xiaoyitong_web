#!/usr/bin/env node
/**
 * 管理员账号种子脚本
 * 用法：node seed-admin.js
 * 可在服务器上单独运行，也可被 setup.js 调用
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';

const ADMIN_ACCOUNTS = [
  { email: 'admin1@xiaoyitong.com', password: 'admin123', nickname: '管理员小易' },
  { email: 'admin2@xiaoyitong.com', password: 'admin123', nickname: '管理员小通' },
];

export async function seedAdmins(conn) {
  const salt = await bcrypt.genSalt(10);

  for (const admin of ADMIN_ACCOUNTS) {
    const existing = await conn.query('SELECT id FROM users WHERE email = ?', [admin.email]);
    if (existing[0].length > 0) {
      // 已存在则确保 is_admin = 1
      await conn.query('UPDATE users SET is_admin = 1 WHERE email = ?', [admin.email]);
      console.log(`  ✅ ${admin.email} 已存在，已确保管理员权限`);
      continue;
    }

    const passwordHash = await bcrypt.hash(admin.password, salt);
    const id = uuidv4();
    await conn.query(
      'INSERT INTO users (id, email, password_hash, nickname, school, is_admin, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())',
      [id, admin.email, passwordHash, admin.nickname, '校易通']
    );
    console.log(`  ✅ 已创建管理员：${admin.email}（${admin.nickname}）`);
  }
}

// 独立运行时直接连接数据库执行
if (process.argv[1] && process.argv[1].includes('seed-admin')) {
  const DB_NAME = process.env.DB_NAME || 'xiaoyitongweb';

  async function main() {
    console.log('\n🔧 管理员账号初始化\n');

    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
      charset: 'utf8mb4',
    });

    await seedAdmins(conn);
    await conn.end();

    console.log('\n🎉 管理员账号初始化完成！');
    console.log('   admin1@xiaoyitong.com / admin123');
    console.log('   admin2@xiaoyitong.com / admin123\n');
  }

  main().catch(e => {
    console.error('❌ 初始化失败:', e.message);
    process.exit(1);
  });
}
