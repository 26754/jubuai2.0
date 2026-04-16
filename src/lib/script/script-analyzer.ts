// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.

/**
 * 剧本智能解析器
 * 自动分析剧本内容，提取语言、风格、角色等信息
 */

export type DetectedLanguage = '中文' | 'English' | '日本語';

/**
 * 检测文本中的主要语言
 */
export function detectScriptLanguage(text: string): DetectedLanguage {
  if (!text || text.trim().length < 10) {
    return '中文'; // 默认值
  }

  // 移除空白字符进行统计
  const cleanText = text.replace(/\s/g, '');
  
  // 统计各类字符
  const chineseChars = (cleanText.match(/[\u4e00-\u9fff]/g) || []).length;
  const japaneseChars = (cleanText.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const englishChars = (cleanText.match(/[a-zA-Z]/g) || []).length;
  
  const totalChars = chineseChars + japaneseChars + englishChars;
  
  if (totalChars === 0) {
    return '中文'; // 默认值
  }
  
  // 计算比例
  const chineseRatio = chineseChars / totalChars;
  const japaneseRatio = japaneseChars / totalChars;
  const englishRatio = englishChars / totalChars;
  
  // 阈值判断
  if (japaneseRatio > 0.3 && japaneseRatio > chineseRatio && japaneseRatio > englishRatio) {
    return '日本語';
  }
  
  if (englishRatio > 0.7) {
    return 'English';
  }
  
  if (chineseRatio > 0.3) {
    return '中文';
  }
  
  // 如果比例接近，选择最多的
  const maxRatio = Math.max(chineseRatio, japaneseRatio, englishRatio);
  if (maxRatio === chineseRatio) return '中文';
  if (maxRatio === japaneseRatio) return '日本語';
  return 'English';
}

/**
 * 检测提示词语言（用于 AI 生成）
 */
export type PromptLanguage = 'zh' | 'en' | 'zh+en';

/**
 * 根据剧本语言推断提示词语言
 */
export function inferPromptLanguage(scriptLanguage: DetectedLanguage): PromptLanguage {
  switch (scriptLanguage) {
    case 'English':
      return 'en';
    case '日本語':
      return 'zh+en'; // 日文内容用中日混合提示词
    case '中文':
    default:
      return 'zh';
  }
}

/**
 * 提取剧本中的角色列表
 */
export function extractCharacters(text: string): string[] {
  const characters: Set<string> = new Set();
  
  // 匹配冒号前的角色名（中文场景格式）
  // 例如: "小明：..." 或 "船长：..."
  const chinesePattern = /^([^：\n]+)：/gm;
  let match;
  while ((match = chinesePattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (name.length >= 1 && name.length <= 10 && !/^\d+$/.test(name)) {
      characters.add(name);
    }
  }
  
  // 匹配英文格式
  // 例如: "Character:"
  const englishPattern = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):/gm;
  while ((match = englishPattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (name.length >= 2 && name.length <= 20) {
      characters.add(name);
    }
  }
  
  // 匹配括号内或星号内的旁白/动作描述
  // 例如: "（旁白）" 或 "**角色名**"
  const actionPattern = /[（\(【\[]([^）\)]+)[）\)\]】]/g;
  while ((match = actionPattern.exec(text)) !== null) {
    const content = match[1].trim();
    if (content.length >= 2 && content.length <= 20) {
      // 排除一些常见的旁白词
      if (!['旁白', '解说', '内心', 'OS', 'V.O.', '画外音'].includes(content)) {
        characters.add(content);
      }
    }
  }
  
  return Array.from(characters).slice(0, 20); // 最多返回20个
}

/**
 * 估算剧本时长
 */
export function estimateDuration(text: string): string {
  // 粗略估算：每100个中文字符约10秒
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  
  const totalEstimate = chineseChars / 10 + englishWords / 3; // 英文约3词/10秒
  
  // 映射到最近的预设时长
  const durations = [
    { value: '10s', seconds: 10 },
    { value: '15s', seconds: 15 },
    { value: '20s', seconds: 20 },
    { value: '30s', seconds: 30 },
    { value: '60s', seconds: 60 },
    { value: '90s', seconds: 90 },
    { value: '120s', seconds: 120 },
    { value: '180s', seconds: 180 },
  ];
  
  // 找到最接近的时长
  let closest = durations[0];
  for (const d of durations) {
    if (Math.abs(d.seconds - totalEstimate) < Math.abs(closest.seconds - totalEstimate)) {
      closest = d;
    }
  }
  
  // 如果太短或太长，返回默认值
  if (totalEstimate < 15) return '30s';
  if (totalEstimate > 180) return '180s';
  
  return closest.value;
}

/**
 * 估算场景数量
 */
export function estimateSceneCount(text: string): string {
  // 统计常见场景分隔符
  const sceneSeparators = [
    /第[一二三四五六七八九十百千万\d]+场/,
    /第[一二三四五六七八九十百千万\d]+幕/,
    /场景\d+/,
    /Scene\s*\d+/i,
    /场\s*\d+/,
  ];
  
  let count = 1;
  for (const pattern of sceneSeparators) {
    const matches = text.match(pattern);
    if (matches) {
      count = Math.max(count, matches.length);
    }
  }
  
  // 统计换行数（粗略估计）
  const lines = text.split(/\n/).filter(l => l.trim().length > 0);
  if (count === 1 && lines.length > 20) {
    count = Math.ceil(lines.length / 10);
  }
  
  // 限制范围
  if (count > 10) count = 10;
  if (count < 1) count = 1;
  
  return String(count);
}

/**
 * 检测视觉风格关键词
 */
export function detectVisualStyleKeywords(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();
  
  // 风格关键词映射
  const styleKeywords: Record<string, string[]> = {
    '3d_xuanhuan': ['仙侠', '修仙', '玄幻', '魔法', '斗气', '异世界', '奇幻', '魔幻'],
    '3d_american': ['好莱坞', '欧美', '美式', '科幻', '太空', '超级英雄', '漫威', 'dc'],
    '2d_animation': ['日漫', '二次元', '动漫', '卡通', '动画', '日系'],
    'cyberpunk': ['赛博朋克', '未来', '科技', '霓虹', '废土', '末世'],
    'watercolor': ['水彩', '手绘', '插画', '绘本'],
    'oil_painting': ['油画', '古典', '文艺复兴', '印象派'],
    'chinese_classic': ['古风', '武侠', '历史', '传统', '古典'],
    'realistic': ['写实', '真实', '纪录片', '真人'],
  };
  
  for (const [style, words] of Object.entries(styleKeywords)) {
    for (const word of words) {
      if (lowerText.includes(word.toLowerCase())) {
        keywords.push(style);
        break;
      }
    }
  }
  
  return keywords;
}

/**
 * 完整的剧本分析结果
 */
export interface ScriptAnalysisResult {
  language: DetectedLanguage;
  promptLanguage: PromptLanguage;
  characters: string[];
  estimatedDuration: string;
  estimatedSceneCount: string;
  styleKeywords: string[];
  wordCount: number;
}

/**
 * 分析剧本内容
 */
export function analyzeScript(text: string): ScriptAnalysisResult {
  return {
    language: detectScriptLanguage(text),
    promptLanguage: inferPromptLanguage(detectScriptLanguage(text)),
    characters: extractCharacters(text),
    estimatedDuration: estimateDuration(text),
    estimatedSceneCount: estimateSceneCount(text),
    styleKeywords: detectVisualStyleKeywords(text),
    wordCount: text.length,
  };
}
