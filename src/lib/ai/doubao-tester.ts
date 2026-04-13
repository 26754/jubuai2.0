// Copyright (c) 2025 JuBu AI
// 火山引擎豆包 API 测试工具

// 火山引擎 ARK 多区域端点
export const DOUBAN_ENDPOINTS = {
  'cn-beijing': 'https://ark.cn-beijing.volces.com/api/v3',
  'cn-shanghai': 'https://ark.cn-shanghai.volces.com/api/v3',
  'cn-guangzhou': 'https://ark.cn-guangzhou.volces.com/api/v3',
} as const;

export type DoubanEndpointRegion = keyof typeof DOUBAN_ENDPOINTS;

// 默认端点（北京区域）
const DEFAULT_ENDPOINT = DOUBAN_ENDPOINTS['cn-beijing'];

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 30000;

/**
 * 创建带超时的 fetch 请求
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 测试豆包 API 可用性
 * @param apiKey 火山引擎 API Key
 * @param model 模型名称 (默认: doubao-pro-32k)
 * @param region 区域选择 (默认: cn-beijing)
 * @returns 测试结果
 */
export async function testDoubaoAPI(
  apiKey: string,
  model: string = 'doubao-pro-32k',
  region: DoubanEndpointRegion = 'cn-beijing'
): Promise<{
  success: boolean;
  message: string;
  response?: any;
  latency?: number;
}> {
  const startTime = Date.now();
  const endpoint = DOUBAN_ENDPOINTS[region] || DEFAULT_ENDPOINT;
  
  try {
    const response = await fetchWithTimeout(`${endpoint}/chat/completions`, {
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
      let errorMessage = '';
      
      // 根据状态码提供更友好的错误信息
      switch (response.status) {
        case 401:
          errorMessage = 'API Key 无效或已过期';
          break;
        case 403:
          errorMessage = 'API Key 权限不足';
          break;
        case 404:
          errorMessage = `模型 ${model} 不存在`;
          break;
        case 429:
          errorMessage = '请求频率超限，请稍后重试';
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = '火山引擎服务器繁忙，请稍后重试';
          break;
        default:
          errorMessage = errorData.error?.message || errorData.error || `HTTP ${response.status}`;
      }
      
      return {
        success: false,
        message: errorMessage,
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
    // 处理超时
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: `请求超时（${REQUEST_TIMEOUT / 1000}秒），请检查网络或 API 可用性`,
        latency: Date.now() - startTime,
      };
    }
    
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
 * @param region 区域选择 (默认: cn-beijing)
 * @returns 测试结果
 */
export async function testDoubaoVisionAPI(
  apiKey: string,
  imageUrl: string,
  question: string = '描述这张图片',
  region: DoubanEndpointRegion = 'cn-beijing'
): Promise<{
  success: boolean;
  message: string;
  response?: any;
  latency?: number;
}> {
  const startTime = Date.now();
  const endpoint = DOUBAN_ENDPOINTS[region] || DEFAULT_ENDPOINT;
  
  try {
    const response = await fetchWithTimeout(`${endpoint}/chat/completions`, {
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
      let errorMessage = '';
      
      switch (response.status) {
        case 401:
          errorMessage = 'API Key 无效或已过期';
          break;
        case 403:
          errorMessage = 'API Key 权限不足，请确认已开通视觉理解能力';
          break;
        case 404:
          errorMessage = '模型不支持视觉功能';
          break;
        case 429:
          errorMessage = '请求频率超限，请稍后重试';
          break;
        default:
          errorMessage = errorData.error?.message || errorData.error || `HTTP ${response.status}`;
      }
      
      return {
        success: false,
        message: errorMessage,
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
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: `请求超时（${REQUEST_TIMEOUT / 1000}秒），请检查网络连接`,
        latency: Date.now() - startTime,
      };
    }
    
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
  // Seedance 2.0 系列
  {
    id: 'doubao-seedance-2-0-pro-t2v-260610',
    name: 'Seedance 2.0 Pro 文生视频',
    description: '新一代高性能视频生成模型，支持文生视频',
    supports: ['video']
  },
  {
    id: 'doubao-seedance-2-0-pro-i2v-260610',
    name: 'Seedance 2.0 Pro 图生视频',
    description: '新一代高性能视频生成模型，支持图生视频',
    supports: ['video']
  },
  {
    id: 'doubao-seedance-2-0-pro-t2v-fast-260610',
    name: 'Seedance 2.0 Pro Fast 文生视频',
    description: '新一代快速视频生成模型',
    supports: ['video']
  },
  // Seedance 1.5 系列
  {
    id: 'doubao-seedance-1-5-pro-251215',
    name: 'Seedance 1.5 Pro 视频生成',
    description: '高性能视频生成模型，支持文生视频和图生视频',
    supports: ['video']
  },
  {
    id: 'doubao-seedance-1-0-pro-fast-251015',
    name: 'Seedance 1.0 Pro Fast 视频生成',
    description: '快速视频生成模型',
    supports: ['video']
  },
  {
    id: 'doubao-seedream-4-5 
    name: 'Seedream 4.5 图像生成',
    description: '高质量图像生成模型',
    supports: ['image']
  },
  {
    id: 'doubao-seedream-3-0-t2i-250415',
    name: 'Seedream 3.0 图像生成',
    description: '图像生成模型',
    supports: ['image']
  },
];
