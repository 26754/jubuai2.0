// 火山引擎豆包 API 测试脚本
// 使用方法：node test-doubao.js <API_KEY> [MODEL_NAME]

const API_KEY = process.argv[2];
const MODEL = process.argv[3] || 'doubao-pro-32k';
const ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

if (!API_KEY) {
  console.error('❌ 请提供 API Key');
  console.log('使用方式: node test-doubao.js <API_KEY> [MODEL_NAME]');
  console.log('示例: node test-doubao.js sk-xxx doubao-pro-32k');
  process.exit(1);
}

console.log('🚀 开始测试火山引擎豆包 API...');
console.log(`📋 模型: ${MODEL}`);
console.log(`🔗 端点: ${ENDPOINT}`);
console.log('⏱️  开始时间:', new Date().toISOString());
console.log('');

async function testDoubaoAPI() {
  const startTime = Date.now();
  
  try {
    console.log('📡 发送请求...');
    
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: '你好，请用一句话介绍一下你自己。'
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API 调用失败');
      console.error(`   状态码: ${response.status}`);
      console.error(`   错误: ${errorData.error?.message || errorData.error || '未知错误'}`);
      console.log('');
      console.log(`⏱️ 耗时: ${latency}ms`);
      process.exit(1);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      console.log('✅ API 调用成功！');
      console.log('');
      console.log('📊 响应信息:');
      console.log(`   模型: ${data.model}`);
      console.log(`   耗时: ${latency}ms`);
      console.log('');
      console.log('💬 AI 回复:');
      console.log(`   ${data.choices[0].message.content}`);
      console.log('');
      
      if (data.usage) {
        console.log('📈 Token 使用情况:');
        console.log(`   输入: ${data.usage.prompt_tokens || 'N/A'}`);
        console.log(`   输出: ${data.usage.completion_tokens || 'N/A'}`);
        console.log(`   总计: ${data.usage.total_tokens || 'N/A'}`);
      }
      
      console.log('');
      console.log('✅ 测试通过！');
      process.exit(0);
    } else {
      console.error('❌ API 返回格式异常');
      console.log('📦 原始响应:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 网络错误');
    console.error(`   ${error.message}`);
    console.log('');
    console.log(`⏱️ 耗时: ${Date.now() - startTime}ms`);
    process.exit(1);
  }
}

testDoubaoAPI();
