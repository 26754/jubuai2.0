// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * Smart Resource Matcher
 * 
 * 智能资源匹配器 - 在已有角色库/场景库中智能匹配相似资源
 * 
 * 功能：
 * 1. 角色模糊匹配（名称、性别、特征描述）
 * 2. 场景模糊匹配（地点名称、时间、氛围）
 * 3. 相似度计算与排名
 * 4. 自动推荐关联
 */

import type { ScriptCharacter, ScriptScene } from '@/types/script';
import type { Character } from '@/stores/character-library-store';
import type { Scene } from '@/stores/scene-store';

// ==================== 类型定义 ====================

/** 角色匹配结果 */
export interface CharacterMatchResult {
  /** 匹配的角色库ID */
  libraryId: string;
  /** 匹配的角色名称 */
  name: string;
  /** 匹配度 0-100 */
  score: number;
  /** 匹配原因 */
  reasons: string[];
  /** 匹配的特征 */
  matchedFeatures: {
    name?: number;        // 名称相似度 0-100
    gender?: number;      // 性别匹配
    traits?: number;      // 特质相似度
    appearance?: number;   // 外貌相似度
    role?: number;        // 身份背景相似度
  };
}

/** 场景匹配结果 */
export interface SceneMatchResult {
  /** 匹配的场景库ID */
  libraryId: string;
  /** 匹配的场景名称 */
  name: string;
  /** 匹配度 0-100 */
  score: number;
  /** 匹配原因 */
  reasons: string[];
  /** 匹配的特征 */
  matchedFeatures: {
    name?: number;        // 地点名称相似度
    location?: number;    // 位置相似度
    time?: number;        // 时间相似度
    atmosphere?: number;  // 氛围相似度
    style?: number;       // 风格相似度
  };
}

/** 匹配选项 */
export interface MatchOptions {
  /** 最小匹配分数阈值 */
  minScore?: number;
  /** 最大返回数量 */
  maxResults?: number;
  /** 是否考虑同义词 */
  useSynonyms?: boolean;
}

// ==================== 同义词词典 ====================

/** 常用同义词映射 */
const SYNONYMS: Record<string, string[]> = {
  // 地点
  '教室': ['教室', '课堂', '学校教室', '教室内景', '教室外', ' classroom'],
  '教室': ['教学楼', '教室', '课室', '讲堂'],
  '客厅': ['客厅', '起居室', '会客厅', ' living room', ' lounge'],
  '卧室': ['卧室', '卧房', '睡房', ' bedroom', '私室'],
  '办公室': ['办公室', '写字间', '办公区', ' office'],
  '餐厅': ['餐厅', '饭厅', '食堂', ' dining room', '餐厅'],
  '厨房': ['厨房', '灶台', '厨房', ' kitchen'],
  '街道': ['街道', '马路', '大街', '道路', ' street', 'road'],
  '公园': ['公园', '园林', '绿地', ' park', 'garden'],
  '海边': ['海边', '海滩', '海滨', '沙滩', ' sea', 'beach', 'coast'],
  '学校': ['学校', '校园', '学院', ' school', 'college', 'university'],
  '医院': ['医院', '诊所', '医务室', ' hospital', 'clinic'],
  '咖啡厅': ['咖啡厅', '咖啡馆', '奶茶店', ' cafe', 'coffee shop'],
  '酒吧': ['酒吧', '酒馆', ' pub', 'bar'],
  '商店': ['商店', '店铺', '商场', ' store', 'shop', 'mall'],
  '图书馆': ['图书馆', '阅览室', '书库', ' library'],
  '电影院': ['电影院', '影城', ' theater', 'cinema'],
  
  // 角色
  '老师': ['老师', '教师', '导师', ' instructor', 'teacher'],
  '医生': ['医生', '医师', '大夫', ' doctor', 'physician'],
  '警察': ['警察', '警官', '公安', ' police', 'cop'],
  '学生': ['学生', '学员', '学子', ' student'],
  '朋友': ['朋友', '友人', '伙伴', ' friend', 'buddy'],
  '父母': ['父母', '爸妈', '双亲', ' parents', 'father', 'mother'],
  '老板': ['老板', '经理', '上司', ' boss', 'manager'],
  '同事': ['同事', '同僚', ' coworker', 'colleague'],
  '医生': ['医生', '护士', '医士', ' medical', 'nurse'],
  '服务员': ['服务员', '侍者', '店员', ' waiter', 'server', 'staff'],
  
  // 时间
  '白天': ['白天', '日间', '上午', '下午', ' daytime', 'day'],
  '夜晚': ['夜晚', '夜里', '夜间', ' night', 'evening'],
  '早晨': ['早晨', '早上', '清晨', ' morning'],
  '中午': ['中午', '正午', ' midday', 'noon'],
  '黄昏': ['黄昏', '傍晚', ' twilight', 'dusk', 'sunset'],
  '黎明': ['黎明', '清晨', '拂晓', ' dawn', 'sunrise'],
  
  // 氛围
  '温馨': ['温馨', '温暖', '温情', ' cozy', 'warm'],
  '紧张': ['紧张', '压迫', '不安', ' tense', 'nervous'],
  '浪漫': ['浪漫', '柔情', '情调', ' romantic'],
  '悲伤': ['悲伤', '哀伤', '凄凉', ' sad', 'sorrowful'],
  '欢乐': ['欢乐', '愉快', '开心', ' happy', 'joyful'],
  '神秘': ['神秘', '诡异', '玄妙', ' mysterious', 'mysterious'],
  '恐怖': ['恐怖', '惊悚', '吓人', ' scary', 'horror'],
  '平静': ['平静', '安宁', '宁静', ' peaceful', 'calm'],
};

// ==================== 辅助函数 ====================

/**
 * 计算字符串相似度（Levenshtein 距离）
 */
function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 100;
  
  // 包含关系检查
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return Math.round((minLen / maxLen) * 100);
  }
  
  // 字符级编辑距离
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * 检查是否包含同义词
 */
function checkSynonyms(keyword: string, text: string): boolean {
  const normalizedText = text.toLowerCase();
  const synonyms = SYNONYMS[keyword] || [];
  
  for (const syn of synonyms) {
    if (normalizedText.includes(syn.toLowerCase())) {
      return true;
    }
  }
  
  // 反向检查
  for (const [key, values] of Object.entries(SYNONYMS)) {
    if (values.some(v => normalizedText.includes(v.toLowerCase()))) {
      if (values.includes(keyword) || keyword.includes(key)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 分词（简单的中英文混合分词）
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  
  // 中文分词（简单的基于标点和空格的分割）
  const tokens = text
    .toLowerCase()
    .split(/[\s,，、。！？；：""''（）【】《》\-_]+/)
    .filter(t => t.length >= 1);
  
  return tokens;
}

/**
 * 计算特征匹配度
 */
function calculateFeatureScore(query: string, target: string | undefined): number {
  if (!query || !target) return 0;
  
  const queryTokens = tokenize(query);
  const targetTokens = tokenize(target);
  
  let maxScore = 0;
  for (const qt of queryTokens) {
    for (const tt of targetTokens) {
      const score = stringSimilarity(qt, tt);
      if (score > maxScore) {
        maxScore = score;
      }
    }
  }
  
  // 直接包含检查
  if (target.includes(query) || query.includes(target)) {
    return Math.max(maxScore, 80);
  }
  
  return maxScore;
}

// ==================== 角色匹配 ====================

/**
 * 智能匹配角色库中的角色
 * 
 * @param scriptChar 剧本中的角色数据
 * @param libraryChars 角色库中的角色列表
 * @param options 匹配选项
 * @returns 匹配结果列表（按匹配度排序）
 */
export function matchCharacterToLibrary(
  scriptChar: ScriptCharacter,
  libraryChars: Character[],
  options: MatchOptions = {}
): CharacterMatchResult[] {
  const { minScore = 30, maxResults = 5, useSynonyms = true } = options;
  
  const results: CharacterMatchResult[] = [];
  
  for (const libChar of libraryChars) {
    const matchedFeatures: CharacterMatchResult['matchedFeatures'] = {};
    const reasons: string[] = [];
    let totalScore = 0;
    let featureCount = 0;
    
    // 1. 名称匹配（权重最高）
    const nameScore = stringSimilarity(scriptChar.name, libChar.name);
    if (nameScore > 30) {
      matchedFeatures.name = nameScore;
      totalScore += nameScore * 0.4; // 40% 权重
      featureCount++;
      if (nameScore >= 80) {
        reasons.push(`名称高度相似「${libChar.name}」(${nameScore}%)`);
      } else if (nameScore >= 50) {
        reasons.push(`名称相似「${libChar.name}」(${nameScore}%)`);
      }
    }
    
    // 2. 性别匹配
    if (scriptChar.gender && libChar.gender) {
      const genderMap: Record<string, string[]> = {
        'male': ['男', '男性', 'male'],
        'female': ['女', '女性', 'female'],
      };
      const scriptGenders = genderMap[scriptChar.gender] || [scriptChar.gender];
      const libGenders = genderMap[libChar.gender] || [libChar.gender];
      const genderMatch = scriptGenders.some(sg => libGenders.includes(sg));
      if (genderMatch) {
        matchedFeatures.gender = 100;
        totalScore += 15; // 15% 权重
        featureCount++;
      }
    }
    
    // 3. 特质匹配
    if (scriptChar.traits || libChar.traits || scriptChar.personality || libChar.personality) {
      const traitsQuery = [scriptChar.traits, scriptChar.personality].filter(Boolean).join(' ');
      const traitsTarget = [libChar.traits, libChar.personality].filter(Boolean).join(' ');
      const traitsScore = calculateFeatureScore(traitsQuery, traitsTarget);
      if (traitsScore > 30) {
        matchedFeatures.traits = traitsScore;
        totalScore += traitsScore * 0.15; // 15% 权重
        featureCount++;
        if (traitsScore >= 70) {
          reasons.push(`特质高度相似 (${traitsScore}%)`);
        }
      }
    }
    
    // 4. 外貌匹配
    if (scriptChar.appearance || libChar.appearance) {
      const appearanceScore = calculateFeatureScore(scriptChar.appearance || '', libChar.appearance);
      if (appearanceScore > 30) {
        matchedFeatures.appearance = appearanceScore;
        totalScore += appearanceScore * 0.1; // 10% 权重
        featureCount++;
      }
    }
    
    // 5. 身份背景匹配
    if (scriptChar.role || libChar.role) {
      const roleScore = calculateFeatureScore(scriptChar.role || '', libChar.role);
      if (roleScore > 30) {
        matchedFeatures.role = roleScore;
        totalScore += roleScore * 0.2; // 20% 权重
        featureCount++;
        if (roleScore >= 70) {
          reasons.push(`身份背景相似 (${roleScore}%)`);
        }
      }
    }
    
    // 6. 同义词检查（地点/身份）
    if (useSynonyms && (scriptChar.role || scriptChar.name)) {
      const checkText = [scriptChar.role, scriptChar.name, scriptChar.traits].filter(Boolean).join(' ');
      const targetText = [libChar.role, libChar.name, libChar.traits, libChar.personality].filter(Boolean).join(' ');
      
      if (checkSynonyms(checkText, targetText)) {
        totalScore += 10;
        reasons.push('存在同义词关联');
      }
    }
    
    // 计算最终分数
    const finalScore = featureCount > 0 ? Math.round(totalScore) : 0;
    
    if (finalScore >= minScore) {
      results.push({
        libraryId: libChar.id,
        name: libChar.name,
        score: finalScore,
        reasons,
        matchedFeatures,
      });
    }
  }
  
  // 按分数排序并返回前 N 个
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * 批量匹配剧本角色到角色库
 * 
 * @param scriptChars 剧本中的角色列表
 * @param libraryChars 角色库中的角色列表
 * @param options 匹配选项
 * @returns 匹配结果映射表
 */
export function batchMatchCharacters(
  scriptChars: ScriptCharacter[],
  libraryChars: Character[],
  options: MatchOptions = {}
): Map<string, CharacterMatchResult[]> {
  const matchMap = new Map<string, CharacterMatchResult[]>();
  
  for (const scriptChar of scriptChars) {
    const matches = matchCharacterToLibrary(scriptChar, libraryChars, options);
    if (matches.length > 0) {
      matchMap.set(scriptChar.id, matches);
    }
  }
  
  return matchMap;
}

// ==================== 场景匹配 ====================

/**
 * 智能匹配场景库中的场景
 * 
 * @param scriptScene 剧本中的场景数据
 * @param libraryScenes 场景库中的场景列表
 * @param options 匹配选项
 * @returns 匹配结果列表（按匹配度排序）
 */
export function matchSceneToLibrary(
  scriptScene: ScriptScene,
  libraryScenes: Scene[],
  options: MatchOptions = {}
): SceneMatchResult[] {
  const { minScore = 30, maxResults = 5, useSynonyms = true } = options;
  
  const results: SceneMatchResult[] = [];
  
  for (const libScene of libraryScenes) {
    const matchedFeatures: SceneMatchResult['matchedFeatures'] = {};
    const reasons: string[] = [];
    let totalScore = 0;
    let featureCount = 0;
    
    // 1. 名称/地点匹配（权重最高）
    const locationQuery = scriptScene.location || scriptScene.name || '';
    const locationTarget = libScene.location || libScene.name || '';
    const nameScore = stringSimilarity(locationQuery, locationTarget);
    
    if (nameScore > 30) {
      matchedFeatures.name = nameScore;
      totalScore += nameScore * 0.4; // 40% 权重
      featureCount++;
      if (nameScore >= 80) {
        reasons.push(`地点高度相似「${libScene.location || libScene.name}」(${nameScore}%)`);
      } else if (nameScore >= 50) {
        reasons.push(`地点相似「${libScene.location || libScene.name}」(${nameScore}%)`);
      }
    }
    
    // 2. 时间匹配
    if (scriptScene.time && libScene.time) {
      const timeScore = stringSimilarity(scriptScene.time, libScene.time);
      if (timeScore > 50) {
        matchedFeatures.time = timeScore;
        totalScore += timeScore * 0.1;
        featureCount++;
        reasons.push(`时间匹配「${libScene.time}」`);
      }
    }
    
    // 3. 氛围匹配
    if (scriptScene.atmosphere && libScene.atmosphere) {
      const atmoScore = stringSimilarity(scriptScene.atmosphere, libScene.atmosphere);
      if (atmoScore > 40) {
        matchedFeatures.atmosphere = atmoScore;
        totalScore += atmoScore * 0.15;
        featureCount++;
        if (atmoScore >= 70) {
          reasons.push(`氛围相似「${libScene.atmosphere}」`);
        }
      }
    }
    
    // 4. 风格匹配
    if (scriptScene.architectureStyle || libScene.architectureStyle) {
      const styleScore = calculateFeatureScore(scriptScene.architectureStyle || '', libScene.architectureStyle);
      if (styleScore > 30) {
        matchedFeatures.style = styleScore;
        totalScore += styleScore * 0.1;
        featureCount++;
      }
    }
    
    // 5. 同义词检查
    if (useSynonyms && locationQuery) {
      if (checkSynonyms(locationQuery, locationTarget)) {
        totalScore += 15;
        featureCount++;
        reasons.push('地点同义词关联');
      }
      
      // 检查是否有共同的子串/关键词
      const queryTokens = tokenize(locationQuery);
      const targetTokens = tokenize(locationTarget);
      const commonTokens = queryTokens.filter(qt => 
        targetTokens.some(tt => 
          tt.includes(qt) || qt.includes(tt) || stringSimilarity(qt, tt) > 60
        )
      );
      if (commonTokens.length > 0) {
        totalScore += 10;
        reasons.push(`关键词重叠: ${commonTokens.join(', ')}`);
      }
    }
    
    // 计算最终分数
    const finalScore = featureCount > 0 ? Math.round(totalScore) : 0;
    
    if (finalScore >= minScore) {
      results.push({
        libraryId: libScene.id,
        name: libScene.name || libScene.location || '未命名场景',
        score: finalScore,
        reasons,
        matchedFeatures,
      });
    }
  }
  
  // 按分数排序并返回前 N 个
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * 批量匹配剧本场景到场景库
 * 
 * @param scriptScenes 剧本中的场景列表
 * @param libraryScenes 场景库中的场景列表
 * @param options 匹配选项
 * @returns 匹配结果映射表
 */
export function batchMatchScenes(
  scriptScenes: ScriptScene[],
  libraryScenes: Scene[],
  options: MatchOptions = {}
): Map<string, SceneMatchResult[]> {
  const matchMap = new Map<string, SceneMatchResult[]>();
  
  for (const scriptScene of scriptScenes) {
    const matches = matchSceneToLibrary(scriptScene, libraryScenes, options);
    if (matches.length > 0) {
      matchMap.set(scriptScene.id, matches);
    }
  }
  
  return matchMap;
}

// ==================== 自动推荐 ====================

/**
 * 获取最佳匹配推荐
 */
export function getBestCharacterMatch(
  scriptChar: ScriptCharacter,
  libraryChars: Character[],
  minRecommendedScore = 60
): CharacterMatchResult | null {
  const matches = matchCharacterToLibrary(scriptChar, libraryChars, { 
    minScore: 30, 
    maxResults: 1 
  });
  return matches.length > 0 && matches[0].score >= minRecommendedScore 
    ? matches[0] 
    : null;
}

/**
 * 获取最佳场景匹配推荐
 */
export function getBestSceneMatch(
  scriptScene: ScriptScene,
  libraryScenes: Scene[],
  minRecommendedScore = 60
): SceneMatchResult | null {
  const matches = matchSceneToLibrary(scriptScene, libraryScenes, { 
    minScore: 30, 
    maxResults: 1 
  });
  return matches.length > 0 && matches[0].score >= minRecommendedScore 
    ? matches[0] 
    : null;
}

/**
 * 获取所有需要创建新资源的剧本角色/场景
 */
export function getUnlinkedResources(
  scriptChars: ScriptCharacter[],
  scriptScenes: ScriptScene[],
  libraryChars: Character[],
  libraryScenes: Scene[],
  matchOptions: MatchOptions = {}
): {
  unlinkedCharacters: ScriptCharacter[];
  unlinkedScenes: ScriptScene[];
  suggestedCharacters: Map<string, CharacterMatchResult>;
  suggestedScenes: Map<string, SceneMatchResult>;
} {
  // 找出未关联的角色
  const linkedCharIds = new Set(
    scriptChars
      .filter(c => c.characterLibraryId || c.characterId)
      .map(c => c.characterLibraryId || c.characterId)
  );
  const unlinkedCharacters = scriptChars.filter(c => !linkedCharIds.has(c.id));
  
  // 找出未关联的场景
  const linkedSceneIds = new Set(
    scriptScenes
      .filter(s => s.sceneLibraryId || s.sceneId)
      .map(s => s.sceneLibraryId || s.sceneId)
  );
  const unlinkedScenes = scriptScenes.filter(s => !linkedSceneIds.has(s.id));
  
  // 为未关联的角色获取推荐
  const suggestedCharacters = new Map<string, CharacterMatchResult>();
  for (const char of unlinkedCharacters) {
    const bestMatch = getBestCharacterMatch(char, libraryChars);
    if (bestMatch) {
      suggestedCharacters.set(char.id, bestMatch);
    }
  }
  
  // 为未关联的场景获取推荐
  const suggestedScenes = new Map<string, SceneMatchResult>();
  for (const scene of unlinkedScenes) {
    const bestMatch = getBestSceneMatch(scene, libraryScenes);
    if (bestMatch) {
      suggestedScenes.set(scene.id, bestMatch);
    }
  }
  
  return {
    unlinkedCharacters,
    unlinkedScenes,
    suggestedCharacters,
    suggestedScenes,
  };
}
