/**
 * JWT 认证模块
 * 用于用户注册、登录、Token 验证
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me-in-production';
const TOKEN_EXPIRY = '7d'; // 7 天过期

// 数据库连接
const getDbPool = () => {
  const connectionString = process.env.NEON_DATABASE_URL;
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });
};

// 用户类型
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

/**
 * 密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 生成 JWT Token
 */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 用户注册
 */
export async function register(email: string, password: string): Promise<AuthResult> {
  // 验证输入
  if (!email || !password) {
    return { success: false, error: '邮箱和密码不能为空' };
  }
  
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: '请输入有效的邮箱地址' };
  }
  
  // 验证密码长度
  if (password.length < 6) {
    return { success: false, error: '密码至少需要 6 个字符' };
  }
  
  try {
    const pool = getDbPool();
    
    // 检查邮箱是否已注册
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existing.rows.length > 0) {
      await pool.end();
      return { success: false, error: '该邮箱已被注册' };
    }
    
    // 哈希密码并创建用户
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash]
    );
    
    await pool.end();
    
    const user: User = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      created_at: result.rows[0].created_at,
    };
    
    const token = generateToken(user.id);
    
    console.log(`[Auth] User registered: ${user.email}`);
    
    return { success: true, user, token };
  } catch (error: any) {
    console.error('[Auth] Register error:', error);
    return { success: false, error: '注册失败，请稍后重试' };
  }
}

/**
 * 用户登录
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  // 验证输入
  if (!email || !password) {
    return { success: false, error: '邮箱和密码不能为空' };
  }
  
  try {
    const pool = getDbPool();
    
    // 查找用户
    const result = await pool.query(
      'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    await pool.end();
    
    if (result.rows.length === 0) {
      return { success: false, error: '邮箱或密码错误' };
    }
    
    const userRow = result.rows[0];
    
    // 验证密码
    const valid = await verifyPassword(password, userRow.password_hash);
    if (!valid) {
      return { success: false, error: '邮箱或密码错误' };
    }
    
    const user: User = {
      id: userRow.id,
      email: userRow.email,
      created_at: userRow.created_at,
    };
    
    const token = generateToken(user.id);
    
    console.log(`[Auth] User logged in: ${user.email}`);
    
    return { success: true, user, token };
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    return { success: false, error: '登录失败，请稍后重试' };
  }
}

/**
 * 获取用户信息
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [userId]
    );
    await pool.end();
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
      created_at: result.rows[0].created_at,
    };
  } catch (error: any) {
    console.error('[Auth] Get user error:', error);
    return null;
  }
}

/**
 * 更新密码
 */
export async function updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<AuthResult> {
  if (!oldPassword || !newPassword) {
    return { success: false, error: '请输入旧密码和新密码' };
  }
  
  if (newPassword.length < 6) {
    return { success: false, error: '新密码至少需要 6 个字符' };
  }
  
  try {
    const pool = getDbPool();
    
    // 获取当前密码
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      await pool.end();
      return { success: false, error: '用户不存在' };
    }
    
    // 验证旧密码
    const valid = await verifyPassword(oldPassword, result.rows[0].password_hash);
    if (!valid) {
      await pool.end();
      return { success: false, error: '旧密码错误' };
    }
    
    // 更新密码
    const newHash = await hashPassword(newPassword);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );
    
    await pool.end();
    
    return { success: true };
  } catch (error: any) {
    console.error('[Auth] Update password error:', error);
    return { success: false, error: '更新密码失败' };
  }
}
