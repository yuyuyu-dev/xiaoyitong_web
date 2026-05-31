#!/usr/bin/env node
/**
 * 一键初始化脚本：检查环境 → 创建 .env → 安装依赖 → 建库 → 导入表 → 启动
 * 使用方式：npm run setup
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log('\n🚀 校易通 — 一键初始化\n');

  // ── 1. .env ──
  const envPath = path.join(ROOT, '.env');
  const envExamplePath = path.join(ROOT, '.env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ 已从 .env.example 创建 .env');
    } else {
      // 生成默认 .env
      const defaultEnv = `DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=xiaoyitongweb
JWT_SECRET=${Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)}
NODE_ENV=development
PORT=3000
`;
      fs.writeFileSync(envPath, defaultEnv);
      console.log('✅ 已创建默认 .env（请检查 DB_PASSWORD 是否需要修改）');
    }
  } else {
    console.log('✅ .env 已存在，跳过');
  }

  // 读取 .env
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });

  // ── 2. 安装依赖 ──
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    console.log('\n📦 安装依赖...\n');
    run('npm install');
  } else {
    console.log('✅ node_modules 已存在，跳过安装');
  }

  // ── 3. 建库 + 导入表 ──
  console.log('\n🗄️  初始化数据库...\n');

  try {
    const mysql = await import('mysql2/promise');
    const conn = await mysql.default.createConnection({
      host: env.DB_HOST || '127.0.0.1',
      port: Number(env.DB_PORT || 3306),
      user: env.DB_USER || 'root',
      password: env.DB_PASSWORD || '',
      multipleStatements: true
    });

    const dbName = env.DB_NAME || 'xiaoyitongweb';
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 "${dbName}" 已就绪`);

    await conn.query(`USE \`${dbName}\``);

    const schemaPath = path.join(ROOT, 'mysql_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      await conn.query(schema);
      console.log('✅ 数据表已导入');
    } else {
      console.log('⚠️  未找到 mysql_schema.sql，跳过建表');
    }

    // 插入管理员账号
    const { seedAdmins } = await import('./seed-admin.js');
    console.log('\n👤 初始化管理员账号...');
    await seedAdmins(conn);

    await conn.end();
  } catch (e) {
    console.error(`\n❌ 数据库连接失败: ${e.message}`);
    console.error('   请确认 MySQL 已启动，并检查 .env 中的 DB_PASSWORD 是否正确\n');
    process.exit(1);
  }

  // ── 4. 创建 uploads 目录 ──
  const uploadsDir = path.join(ROOT, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('✅ 已创建 uploads/ 目录');
  }

  // ── 5. 启动 ──
  console.log('\n🌐 启动服务...\n');
  run('node server.js');
}

main().catch(e => {
  console.error('初始化失败:', e.message);
  process.exit(1);
});
