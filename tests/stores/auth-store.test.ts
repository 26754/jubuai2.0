// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

import { describe, it, expect, vi } from 'vitest';

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

describe('Auth Login Test', () => {
  it('should generate correct password hash for test123', () => {
    const hash = hashPassword('test123');
    console.log('Password hash for "test123":', hash);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(8);
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
});
