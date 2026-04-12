// Copyright (c) 2025 JuBu AI
// 火山引擎豆包 API 测试工具

const DOUBAN_API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

/**
 * 测试豆包 API 可用性
 * @param apiKey 火山引擎 API Key
 * @param model 模型名称 (默认: doubao-pro-32k)
 * @returns 测试结果
 */
export async function testDoubaoAPI(
  apiKey: string,
  model: string = 'doubao-pro-32k'
): Promise<{
  success: boolean;
  message: string;
  response?: any;
  latency?: number;
}> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(DOUBAN_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
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
      return {
        success: false,
        message: `API 调用失败: ${response.status} - ${errorData.error?.message || errorData.error || '未知错误'}`,
        latency,
      };
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return {
        success: true,
        message: 'API 调用成功！',
        response: {
          model: data.model,
          content: data.choices[0].message.content,
          usage: data.usage,
        },
        latency,
      };
    } else {
      return {
        success: false,
        message: 'API 返回格式异常',
        response: data,
        latency,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `网络错误: ${error.message}`,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * 测试豆包图片理解 API
 * @param apiKey 火山引擎 API Key
 * @param imageUrl 图片 URL
 * @param question 关于图片的问题
 * @returns 测试结果
 */
export async function testDoubaoVisionAPI(
  apiKey: string,
  imageUrl: string,
  question: string = '描述这张图片'
): Promise<{
  success: boolean;
  message: string;
  response?: any;
  latency?: number;
}> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(DOUBAN_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'doubao-pro-32k', // 支持视觉的模型
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: question
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `API 调用失败: ${response.status} - ${errorData.error?.message || errorData.error || '未知错误'}`,
        latency,
      };
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return {
        success: true,
        message: '视觉 API 调用成功！',
        response: {
          model: data.model,
          content: data.choices[0].message.content,
          usage: data.usage,
        },
        latency,
      };
    } else {
      return {
        success: false,
        message: 'API 返回格式异常',
        response: data,
        latency,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `网络错误: ${error.message}`,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * 获取豆包支持的模型列表
 */
export const DOUBAN_MODELS = [
  {
    id: 'doubao-pro-32k',
    name: '豆包 Pro 32K',
    description: '高性能对话模型，32K 上下文',
    supports: ['chat', 'function']
  },
  {
    id: 'doubao-pro-128k',
    name: '豆包 Pro 128K',
    description: '高性能对话模型，128K 上下文',
    supports: ['chat', 'function']
  },
  {
    id: 'doubao-lite-32k',
    name: '豆包 Lite 32K',
    description: '轻量级对话模型，32K 上下文，性价比高',
    supports: ['chat', 'function']
  },
  {
    id: 'doubao-lite-128k',
    name: '豆包 Lite 128K',
    description: '轻量级对话模型，128K 上下文，性价比高',
    supports: ['chat', 'function']
  },
  {
    id: 'doubao-seedance-1-5-pro-251215',
    name: 'Seedance 1.5 Pro',
    description: '视频生成模型',
    supports: ['video']
  },
];
