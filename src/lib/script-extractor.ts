/**
 * Script Extractor Service
 * 从剧本中提取角色和场景信息
 */

import { callFeatureAPI, isFeatureReady } from '@/lib/ai/feature-router';
import type { AIFeature } from '@/stores/api-config-store';

// ==================== 提示词定义 ====================

/**
 * 角色提取提示词
 */
const CHARACTER_EXTRACTION_PROMPT = `你是一位小说人物提取大师，帮我把小说中的人物（按重要性排列）全部提取出来，提取需包含以下核心信息：序号、角色、角色描述、性别、年龄、音色；其中角色描述需重点保证展示人物的正面全身，同时包含：真人风格角色设计图，白色背景，详细的外貌特征（含面部特征、肤色、毛发状态等）、身高、身材气质、服饰（含头饰、发型、上衣、裤子、鞋子），细节拉满，皮肤纹理清晰，服饰质感真实，光影自然柔和；未在小说中明确描述的信息（外貌特征、身高、年龄、音色等），需结合小说剧情合理推演补充，确保每个角色的信息完整且贴合剧情设定，所有角色按重要性依次提取，信息表述统一、流畅，无多余冗余内容。

请按以下JSON格式返回：
{
  "characters": [
    {
      "name": "角色名",
      "description": "角色描述（含视觉提示词，详细描述正面全身形象）",
      "gender": "男/女/未知",
      "age": "年龄或年龄段",
      "voice": "音色描述（如：温柔、浑厚、清脆等）",
      "appearance": "外貌特征描述（面部特征、肤色、毛发、身高、身材等）",
      "personality": "性格特征",
      "role": "身份/背景/在剧情中的定位"
    }
  ]
}`;

/**
 * 场景提取提示词
 */
const SCENE_EXTRACTION_PROMPT = `你是一位小说场景提取大师，帮我把小说中的场景（按重要性排列）全部提取出来。

按要求提取出来以表格形式给我：
1.序号
2.场景
3.场景陈设
4.场景细节
5.时间

场景描述包括：真实风格场景角色设计图。以上文字为固定输出。加上具体的场景描述具体细节描述。

风格：真人写实

场景描述里，禁止出现"任何人物"，直接详细的写出来。

请按以下JSON格式返回：
{
  "scenes": [
    {
      "name": "场景名/地点",
      "location": "场景陈设描述（空间布局、家具摆设等）",
      "details": "场景细节描述（光线、色彩、质感等真实风格细节）",
      "time": "时间设定（白天/夜晚/黄昏/清晨等）",
      "atmosphere": "氛围描述（紧张/温馨/神秘/浪漫等）",
      "visualPrompt": "完整的视觉提示词（真人写实风格场景描述）"
    }
  ]
}`;

// ==================== 类型定义 ====================

export interface ExtractedCharacter {
  name: string;
  description: string;
  gender: string;
  age: string;
  voice: string;
  appearance?: string;
  personality?: string;
  role?: string;
}

export interface ExtractedScene {
  name: string;
  location: string;
  details: string;
  time: string;
  atmosphere: string;
  visualPrompt?: string;
}

export interface ExtractionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== 提取函数 ====================

/**
 * 提取角色信息
 */
export async function extractCharacters(scriptContent: string): Promise<ExtractionResult<{ characters: ExtractedCharacter[] }>> {
  if (!isFeatureReady('script_analysis')) {
    return {
      success: false,
      error: '请先在设置中配置剧本分析功能的 API 供应商'
    };
  }

  if (!scriptContent.trim()) {
    return {
      success: false,
      error: '剧本内容为空'
    };
  }

  try {
    console.log('[CharacterExtractor] 开始提取角色...');
    
    const response = await callFeatureAPI(
      'script_analysis',
      CHARACTER_EXTRACTION_PROMPT,
      `请从以下小说剧本中提取所有角色信息：\n\n${scriptContent}`,
      {
        temperature: 0.7,
        maxTokens: 8192
      }
    );

    // 解析 JSON 响应
    const data = parseJsonResponse(response);
    
    if (!data || !data.characters) {
      console.warn('[CharacterExtractor] 未找到角色数据');
      return {
        success: false,
        error: '未能从剧本中提取到角色信息'
      };
    }

    console.log(`[CharacterExtractor] 提取到 ${data.characters.length} 个角色`);
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('[CharacterExtractor] 提取失败:', error);
    return {
      success: false,
      error: `角色提取失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 提取场景信息
 */
export async function extractScenes(scriptContent: string): Promise<ExtractionResult<{ scenes: ExtractedScene[] }>> {
  if (!isFeatureReady('script_analysis')) {
    return {
      success: false,
      error: '请先在设置中配置剧本分析功能的 API 供应商'
    };
  }

  if (!scriptContent.trim()) {
    return {
      success: false,
      error: '剧本内容为空'
    };
  }

  try {
    console.log('[SceneExtractor] 开始提取场景...');
    
    const response = await callFeatureAPI(
      'script_analysis',
      SCENE_EXTRACTION_PROMPT,
      `请从以下小说剧本中提取所有场景信息：\n\n${scriptContent}`,
      {
        temperature: 0.7,
        maxTokens: 8192
      }
    );

    // 解析 JSON 响应
    const data = parseJsonResponse(response);
    
    if (!data || !data.scenes) {
      console.warn('[SceneExtractor] 未找到场景数据');
      return {
        success: false,
        error: '未能从剧本中提取到场景信息'
      };
    }

    console.log(`[SceneExtractor] 提取到 ${data.scenes.length} 个场景`);
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('[SceneExtractor] 提取失败:', error);
    return {
      success: false,
      error: `场景提取失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 同时提取角色和场景
 */
export async function extractAll(scriptContent: string): Promise<{
  characters: ExtractionResult<{ characters: ExtractedCharacter[] }>;
  scenes: ExtractionResult<{ scenes: ExtractedScene[] }>;
}> {
  const [characters, scenes] = await Promise.all([
    extractCharacters(scriptContent),
    extractScenes(scriptContent)
  ]);

  return { characters, scenes };
}

// ==================== 工具函数 ====================

/**
 * 解析 JSON 响应
 */
function parseJsonResponse(response: string): any {
  try {
    // 尝试提取 JSON 代码块
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    
    // 尝试直接解析
    return JSON.parse(response.trim());
  } catch (error) {
    console.error('[parseJsonResponse] JSON 解析失败:', error);
    // 尝试清理响应中的非JSON字符
    const cleaned = response.replace(/^[^{]*?({[\s\S]*})[^}]*?$/, '$1');
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}
