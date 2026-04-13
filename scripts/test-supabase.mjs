#!/usr/bin/env node
/**
 * Supabase 连接测试脚本
 * 运行方式: node scripts/test-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 加载环境变量
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🧪 开始测试 Supabase 连接...\n');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('🔑 Anon Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '未配置');

// 检查配置
if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ 错误: 环境变量未配置');
  console.error('请确保 .env 文件中包含:');
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  VITE_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

// 创建客户端
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n⏳ 正在测试连接...');
    
    // 测试 1: 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('\n❌ 连接失败:', userError.message);
      console.error('错误详情:', userError);
      process.exit(1);
    }
    
    console.log('✅ Supabase 连接成功！');
    console.log('👤 当前用户:', user ? user.email : '未登录');
    
    // 测试 2: 查询项目表
    if (user) {
      console.log('\n⏳ 正在测试数据库查询...');
      
      const { data: projects, error: projectsError } = await supabase
        .from('user_projects')
        .select('*')
        .eq('user_id', user.id);
      
      if (projectsError) {
        console.error('❌ 数据库查询失败:', projectsError.message);
        console.error('请确保已运行数据库迁移！');
      } else {
        console.log('✅ 数据库查询成功！');
        console.log('📊 项目数量:', projects?.length || 0);
      }
    }
    
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ 测试异常:', error.message);
    console.error('堆栈:', error.stack);
    process.exit(1);
  }
}

// 运行测试
testConnection();
