import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'xiaoyitongweb',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  decimalNumbers: true
});

export async function dbQuery(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function dbGetOne(sql, params = []) {
  const rows = await dbQuery(sql, params);
  return rows[0] || null;
}

export async function dbClose() {
  await pool.end();
}

export default pool;
