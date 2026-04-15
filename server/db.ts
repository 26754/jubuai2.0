/**
 * Supabase PostgreSQL 数据库连接模块
 * 用于服务端直接访问 Supabase PostgreSQL 数据库
 */

import pg from 'pg';

const { Pool } = pg;

// Supabase PostgreSQL 连接配置
const supabaseDbUrl = process.env.SUPABASE_DB_URL || 
  `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || ''}@${process.env.SUPABASE_DB_HOST || 'db.voorsnefrbmqgbtfdoel.supabase.co'}:5432/postgres`;

// 创建连接池
const pool = new Pool({
  connectionString: supabaseDbUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 测试连接
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[DB] Connection error:', err.message);
  } else {
    console.log('[DB] Connected to Supabase PostgreSQL at', res.rows[0].now);
  }
});

export default pool;
