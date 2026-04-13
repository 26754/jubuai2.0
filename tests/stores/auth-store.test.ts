// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

import { describe, it, expect } from 'vitest';

// 模拟 hashPassword 函数（从 auth-store.ts 复制）
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

// 模拟用户类型
type User = {
  id: string;
  username: string;
  email: string;
  createdAt: number;
  passwordHash: string;
};

// Demo 用户配置（应该与 auth-store.ts 中的定义一致）
const DEMO_USER = {
  id: 'demo-user-001',
  username: 'demo',
  email: 'demo@jubu.ai',
  passwordHash: '5c7bd16f', // hashPassword('demo123')
};

describe('Auth Login Test', () => {
  it('should generate correct password hash for test123', () => {
    const hash = hashPassword('test123');
    console.log('Password hash for "test123":', hash);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(8);
  });

  it('should generate correct password hash for demo123', () => {
    const hash = hashPassword('demo123');
    console.log('Password hash for "demo123":', hash);
    expect(hash).toBe('5c7bd16f');
  });

  it('should match test user credentials', () => {
    const testPasswordHash = hashPassword('test123');
    const inputPasswordHash = hashPassword('test123');
    
    console.log('Test user password hash:', testPasswordHash);
    console.log('Input password hash:', inputPasswordHash);
    
    expect(testPasswordHash).toBe(inputPasswordHash);
  });

  it('should NOT match wrong password', () => {
    const testPasswordHash = hashPassword('test123');
    const wrongPasswordHash = hashPassword('wrong');
    
    console.log('Test user password hash:', testPasswordHash);
    console.log('Wrong password hash:', wrongPasswordHash);
    
    expect(testPasswordHash).not.toBe(wrongPasswordHash);
  });

  it('should find test user in initial users array', () => {
    // 模拟初始 users 数组
    const initialUsers: User[] = [
      {
        id: 'test-user-001',
        username: 'test',
        email: 'test@example.com',
        createdAt: Date.now(),
        passwordHash: hashPassword('test123'),
      }
    ];

    const inputPasswordHash = hashPassword('test123');
    const user = initialUsers.find(
      u => u.username === 'test' && u.passwordHash === inputPasswordHash
    );

    console.log('Found user:', user);
    expect(user).toBeDefined();
    expect(user?.username).toBe('test');
  });

  it('should fail login with wrong password', () => {
    const initialUsers: User[] = [
      {
        id: 'test-user-001',
        username: 'test',
        email: 'test@example.com',
        createdAt: Date.now(),
        passwordHash: hashPassword('test123'),
      }
    ];

    // 使用错误密码尝试登录
    const wrongPasswordHash = hashPassword('wrongpassword');
    const user = initialUsers.find(
      u => u.username === 'test' && u.passwordHash === wrongPasswordHash
    );

    console.log('Found user with wrong password:', user);
    expect(user).toBeUndefined();
  });

  it('should find registered user by username and password', () => {
    // 模拟注册后的 users 数组
    const registeredUsers: User[] = [
      {
        id: 'test-user-001',
        username: 'test',
        email: 'test@example.com',
        createdAt: Date.now(),
        passwordHash: hashPassword('test123'),
      },
      {
        id: 'user-002',
        username: 'newuser',
        email: 'newuser@example.com',
        createdAt: Date.now(),
        passwordHash: hashPassword('mypassword'),
      }
    ];

    // 模拟登录：查找 newuser 用户
    const inputPasswordHash = hashPassword('mypassword');
    const user = registeredUsers.find(
      u => u.username === 'newuser' && u.passwordHash === inputPasswordHash
    );

    console.log('Found registered user:', user);
    expect(user).toBeDefined();
    expect(user?.username).toBe('newuser');
    expect(user?.email).toBe('newuser@example.com');
  });

  it('should find demo user with correct credentials', () => {
    // 模拟包含 demo 用户的 users 数组
    const users: User[] = [
      {
        id: 'test-user-001',
        username: 'test',
        email: 'test@example.com',
        createdAt: Date.now(),
        passwordHash: hashPassword('test123'),
      },
      DEMO_USER,
    ];

    // 模拟登录 demo 用户
    const inputPasswordHash = hashPassword('demo123');
    const user = users.find(
      u => u.username === 'demo' && u.passwordHash === inputPasswordHash
    );

    console.log('Found demo user:', user);
    expect(user).toBeDefined();
    expect(user?.username).toBe('demo');
    expect(user?.email).toBe('demo@jubu.ai');
  });
});
