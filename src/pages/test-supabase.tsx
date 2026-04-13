// Supabase 连接测试页面
import { createSupabaseClient } from './database/supabase-client';

export default function TestConnection() {
  const testConnection = async () => {
    const supabase = createSupabaseClient();
    
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('Supabase Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '已配置' : '未配置');
    
    try {
      // 测试获取用户
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('连接失败:', error);
        return { success: false, error: error.message };
      }
      
      console.log('当前用户:', user);
      return { success: true, user };
    } catch (error: any) {
      console.error('测试异常:', error);
      return { success: false, error: error.message };
    }
  };
  
  return { testConnection };
}
