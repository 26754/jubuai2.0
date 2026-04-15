/**
 * Neon 数据库初始化脚本
 * 运行方式: node scripts/init-neon-db.js
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { Pool } = pg;

// Neon 连接配置
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_lnP3TVF6jxUL@ep-flat-cloud-a1rt6fw9-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function initNeonDatabase() {
  console.log('[Init] 正在连接到 Neon 数据库...');

  const pool = new Pool({
    connectionString: NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 测试连接
    const testResult = await pool.query('SELECT NOW() as now');
    console.log('[Init] 已连接到 Neon:', testResult.rows[0].now);

    console.log('[Init] 开始创建表结构...');

    // 创建 users 表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[Init] ✓ users 表已创建/验证');

    // 创建 projects 表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        script_data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[Init] ✓ projects 表已创建/验证');

    // 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    `);
    console.log('[Init] ✓ projects 索引已创建');

    // 创建 shots 表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shots (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255) NOT NULL,
        episode_id VARCHAR(255),
        scene_id VARCHAR(255),
        index_data JSONB DEFAULT '{}',
        content JSONB DEFAULT '{}',
        camera JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[Init] ✓ shots 表已创建/验证');

    // 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shots_user_id ON shots(user_id);
      CREATE INDEX IF NOT EXISTS idx_shots_project_id ON shots(project_id);
    `);
    console.log('[Init] ✓ shots 索引已创建');

    // 创建 user_settings 表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL UNIQUE,
        theme VARCHAR(50) DEFAULT 'dark',
        language VARCHAR(20) DEFAULT 'zh-CN',
        api_configs JSONB DEFAULT '{}',
        editor_settings JSONB DEFAULT '{}',
        sync_preferences JSONB DEFAULT '{"autoSync": true, "syncInterval": 30000}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[Init] ✓ user_settings 表已创建/验证');

    // 创建 user_settings 索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    `);
    console.log('[Init] ✓ user_settings 索引已创建');

    console.log('\n[Init] 数据库初始化完成！');
    console.log('[Init] 表结构:');
    console.log('  - users (用户账户)');
    console.log('  - projects (项目数据)');
    console.log('  - shots (分镜数据)');
    console.log('  - user_settings (用户设置)');

    // 清理连接
    await pool.end();
    console.log('[Init] 数据库连接已关闭');

  } catch (error) {
    console.error('[Init] 数据库初始化失败:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// 运行初始化
initNeonDatabase();
