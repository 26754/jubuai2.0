// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * Scene Viewpoint Analyzer
 * 
 * 场景多视角分析器 - AI 自动分析最佳视角数量和位置，提供命名建议
 */

import { callFeatureAPI } from '@/lib/ai/feature-router';
import type { ScriptScene, SceneViewpoint } from '@/types/script';

// ==================== 类型定义 ====================

/** 视角建议 */
export interface ViewpointSuggestion {
  /** 视角名称 */
  name: string;
  /** 英文名称 */
  nameEn: string;
  /** 视角描述 */
  description: string;
  /** 推荐的网格位置 */
  gridPosition: { row: number; col: number };
  /** 关键道具 */
  keyProps: string[];
  /** 适用场景类型 */
  applicableSceneTypes: string[];
  /** 优先级 */
  priority: number;
  /** 置信度 */
  confidence: number;
}

/** 分析结果 */
export interface ViewpointAnalysisResult {
  /** 推荐的总视角数 */
  recommendedCount: number;
  /** 视角列表 */
  viewpoints: ViewpointSuggestion[];
  /** 分析说明 */
  explanation: string;
  /** 推荐的网格布局 */
  gridLayout: { rows: number; cols: number };
  /** 场景类型 */
  sceneType: string;
}

/** 分析选项 */
export interface ViewpointAnalysisOptions {
  /** 最小视角数 */
  minViewpoints?: number;
  /** 最大视角数 */
  maxViewpoints?: number;
  /** 优先考虑的因素 */
  priorities?: ('props' | 'characters' | 'atmosphere' | 'actions')[];
  /** API 配置 */
  apiKey?: string;
  /** 提供商 */
  provider?: string;
}

// ==================== 预设视角模板 ====================

/** 通用视角名称 */
const COMMON_VIEWPOINT_NAMES = {
  overview: { name: '全景', nameEn: 'Overview', description: '展示整个场景的全貌' },
  wide: { name: '广角', nameEn: 'Wide Shot', description: '展示场景的宽阔视野' },
  medium: { name: '中景', nameEn: 'Medium Shot', description: '展示场景的主体部分' },
  close: { name: '特写', nameEn: 'Close-up', description: '聚焦于某个细节' },
  detail: { name: '细节', nameEn: 'Detail Shot', description: '展示道具或装饰细节' },
  entrance: { name: '入口视角', nameEn: 'Entrance', description: '从入口进入的视角' },
  corner: { name: '角落视角', nameEn: 'Corner View', description: '从角落观察的视角' },
  elevated: { name: '俯视', nameEn: 'Bird Eye', description: '从高处俯视整个场景' },
  counter: { name: '柜台视角', nameEn: 'Counter View', description: '柜台或服务台视角' },
  window: { name: '窗边视角', nameEn: 'Window View', description: '从窗户看向室内外' },
  seating: { name: '座位区', nameEn: 'Seating Area', description: '座位或休息区域视角' },
  kitchen: { name: '厨房视角', nameEn: 'Kitchen View', description: '厨房操作区视角' },
  dining: { name: '餐桌区', nameEn: 'Dining Area', description: '餐桌用餐区域视角' },
  living: { name: '客厅中心', nameEn: 'Living Center', description: '客厅中心位置视角' },
  bedroom: { name: '卧室视角', nameEn: 'Bedroom View', description: '卧室主要区域视角' },
  bathroom: { name: '卫浴视角', nameEn: 'Bathroom View', description: '浴室或卫生间视角' },
  outdoor: { name: '户外视角', nameEn: 'Outdoor View', description: '看向户外或室外' },
  street: { name: '街道视角', nameEn: 'Street View', description: '街道或路人视角' },
};

/** 场景类型对应的视角配置 */
const SCENE_TYPE_CONFIGS: Record<string, {
  defaultViewpoints: string[];
  recommendedGrid: { rows: number; cols: number };
  keyElements: string[];
}> = {
  classroom: {
    defaultViewpoints: ['overview', 'teacher_desk', 'student_area', 'blackboard', 'window'],
    recommendedGrid: { rows: 2, cols: 3 },
    keyElements: ['讲台', '黑板', '课桌', '窗户', '门口'],
  },
  living_room: {
    defaultViewpoints: ['overview', 'sofa', 'tv_area', 'coffee_table', 'window'],
    recommendedGrid: { rows: 2, cols: 3 },
    keyElements: ['沙发', '电视', '茶几', '窗户', '门口'],
  },
  bedroom: {
    defaultViewpoints: ['overview', 'bed', 'desk', 'closet', 'window'],
    recommendedGrid: { rows: 2, cols: 2 },
    keyElements: ['床', '书桌', '衣柜', '窗户'],
  },
  kitchen: {
    defaultViewpoints: ['overview', 'counter', 'stove', 'sink', 'dining_table'],
    recommendedGrid: { rows: 2, cols: 3 },
    keyElements: ['操作台', '灶台', '水槽', '餐桌'],
  },
  office: {
    defaultViewpoints: ['overview', 'desk', 'meeting_area', 'window', 'entrance'],
    recommendedGrid: { rows: 2, cols: 3 },
    keyElements: ['办公桌', '会议区', '窗户', '入口'],
  },
  restaurant: {
    defaultViewpoints: ['overview', 'counter', 'seating', 'kitchen', 'entrance'],
    recommendedGrid: { rows: 2, cols: 3 },
    keyElements: ['吧台', '座位区', '厨房', '入口'],
  },
  street: {
    defaultViewpoints: ['overview', 'storefront', 'sidewalk', 'crosswalk', 'building_facade'],
    recommendedGrid: { rows: 2, cols: 3 },
    keyElements: ['店铺门面', '人行道', '斑马线', '建筑外观'],
  },
  park: {
    defaultViewpoints: ['overview', 'bench', 'path', 'fountain', 'trees'],
    recommendedGrid: { rows: 2, cols: 3 },
    keyElements: ['长椅', '小路', '喷泉', '树木'],
  },
  hospital: {
    defaultViewpoints: ['overview', 'reception', 'waiting_area', 'corridor', 'entrance'],
    recommendedGrid: { rows: 2, cols: 3 },
    keyElements: ['接待台', '等候区', '走廊', '入口'],
  },
  school: {
    defaultViewpoints: ['overview', 'courtyard', 'building', 'playground', 'entrance'],
    recommendedGrid: { rows: 2, cols: 3 },
    keyElements: ['庭院', '教学楼', '操场', '校门'],
  },
};

/** 通用场景配置 */
const GENERAL_SCENE_CONFIG = {
  defaultViewpoints: ['overview', 'wide', 'medium', 'detail'],
  recommendedGrid: { rows: 2, cols: 2 },
  keyElements: ['主要区域', '细节', '氛围'],
};

// ==================== 辅助函数 ====================

/**
 * 识别场景类型
 */
function identifySceneType(location: string, atmosphere?: string): string {
  const lowerLocation = location.toLowerCase();
  const lowerAtmosphere = atmosphere?.toLowerCase() || '';
  
  // 教室
  if (/\b(教室|课堂|school\s*class|classroom)\b/.test(lowerLocation)) {
    return 'classroom';
  }
  
  // 客厅
  if (/\b(客厅|起居室|living\s*room|lounge)\b/.test(lowerLocation)) {
    return 'living_room';
  }
  
  // 卧室
  if (/\b(卧室|卧房|bedroom)\b/.test(lowerLocation)) {
    return 'bedroom';
  }
  
  // 厨房
  if (/\b(厨房|kitchen)\b/.test(lowerLocation)) {
    return 'kitchen';
  }
  
  // 办公室
  if (/\b(办公室|办公|office)\b/.test(lowerLocation)) {
    return 'office';
  }
  
  // 餐厅
  if (/\b(餐厅|饭店|食堂|restaurant|dining)\b/.test(lowerLocation)) {
    return 'restaurant';
  }
  
  // 街道
  if (/\b(街道|马路|street|road|路边)\b/.test(lowerLocation)) {
    return 'street';
  }
  
  // 公园
  if (/\b(公园|园林|park|garden)\b/.test(lowerLocation)) {
    return 'park';
  }
  
  // 医院
  if (/\b(医院|诊所|hospital|clinic|医务室)\b/.test(lowerLocation)) {
    return 'hospital';
  }
  
  // 学校
  if (/\b(学校|校园|school|college|university)\b/.test(lowerLocation)) {
    return 'school';
  }
  
  return 'general';
}

/**
 * 生成视角名称建议
 */
function generateViewpointNames(sceneType: string, index: number, totalCount: number): {
  name: string;
  nameEn: string;
  description: string;
} {
  // 根据场景类型获取预设名称
  const config = SCENE_TYPE_CONFIGS[sceneType] || GENERAL_SCENE_CONFIG;
  const presetNames = Object.keys(COMMON_VIEWPOINT_NAMES);
  
  if (index < config.defaultViewpoints.length) {
    const presetKey = config.defaultViewpoints[index];
    const preset = COMMON_VIEWPOINT_NAMES[presetKey as keyof typeof COMMON_VIEWPOINT_NAMES] || {
      name: `视角${index + 1}`,
      nameEn: `Viewpoint ${index + 1}`,
      description: '场景视角',
    };
    return preset;
  }
  
  // 动态生成名称
  const positions = ['A', 'B', 'C', 'D', 'E', 'F'];
  return {
    name: `视角${positions[index] || index + 1}`,
    nameEn: `Viewpoint ${positions[index] || index + 1}`,
    description: `场景区域 ${index + 1}`,
  };
}

/**
 * 计算推荐视角数
 */
function calculateRecommendedCount(
  sceneType: string,
  keyProps: string[] = [],
  hasCharacters: boolean = false
): number {
  const config = SCENE_TYPE_CONFIGS[sceneType] || GENERAL_SCENE_CONFIG;
  let count = config.defaultViewpoints.length;
  
  // 根据关键道具数量调整
  if (keyProps.length > 5) {
    count = Math.min(count + 1, 6);
  }
  
  // 如果有角色，增加一个角色视角
  if (hasCharacters) {
    count = Math.min(count + 1, 6);
  }
  
  // 限制在 3-6 之间
  return Math.max(3, Math.min(count, 6));
}

/**
 * 计算推荐网格布局
 */
function calculateGridLayout(count: number): { rows: number; cols: number } {
  if (count <= 4) {
    return { rows: 2, cols: 2 };
  }
  if (count <= 6) {
    return { rows: 2, cols: 3 };
  }
  if (count <= 9) {
    return { rows: 3, cols: 3 };
  }
  return { rows: 3, cols: 4 };
}

/**
 * 为视角分配网格位置
 */
function assignGridPositions(
  viewpoints: ViewpointSuggestion[],
  gridLayout: { rows: number; cols: number }
): ViewpointSuggestion[] {
  const { rows, cols } = gridLayout;
  const totalCells = rows * cols;
  
  return viewpoints.map((vp, index) => {
    if (index < totalCells) {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        ...vp,
        gridPosition: { row, col },
      };
    }
    // 如果视角数超过网格数，放到最后一个位置
    return {
      ...vp,
      gridPosition: { row: rows - 1, col: cols - 1 },
    };
  });
}

// ==================== 核心函数 ====================

/**
 * AI 分析场景多视角
 * 
 * @param scene 场景数据
 * @param options 分析选项
 * @returns 分析结果
 */
export async function analyzeSceneViewpoints(
  scene: ScriptScene,
  options: ViewpointAnalysisOptions = {}
): Promise<ViewpointAnalysisResult> {
  const {
    minViewpoints = 3,
    maxViewpoints = 6,
    priorities = ['props', 'characters', 'atmosphere'],
  } = options;
  
  // 识别场景类型
  const sceneType = identifySceneType(scene.location, scene.atmosphere);
  
  // 获取场景配置
  const config = SCENE_TYPE_CONFIGS[sceneType] || GENERAL_SCENE_CONFIG;
  
  // 构建分析提示词
  const analysisPrompt = `
请分析以下场景，推荐最佳的多视角联合图配置：

## 场景信息
- 场景名称：${scene.name || '未命名'}
- 场景地点：${scene.location}
- 时间：${scene.time || '未指定'}
- 氛围：${scene.atmosphere || '未指定'}
- 关键道具：${scene.keyProps?.join('、') || '无'}
- 场景类型：${sceneType}

## 分析要求
1. 推荐 ${minViewpoints}-${maxViewpoints} 个视角
2. 考虑以下因素的优先级：${priorities.join(', ')}
3. 每个视角需要：
   - 中文名称（如：全景、特写、角落视角等）
   - 英文名称
   - 简短描述
   - 关键道具（从场景中提取）

请以 JSON 格式返回分析结果：
{
  "recommendedCount": 数量,
  "viewpoints": [
    {
      "name": "中文名称",
      "nameEn": "English Name",
      "description": "描述",
      "keyProps": ["道具1", "道具2"],
      "priority": 优先级(1-10)
    }
  ],
  "explanation": "分析说明",
  "sceneType": "场景类型"
}
`;

  try {
    // 调用 AI API
    const result = await callFeatureAPI(
      {
        feature: 'script_analysis',
        prompt: analysisPrompt,
        systemPrompt: '你是一个专业的影视美术设计助手，擅长分析场景并推荐最佳的多视角配置。请以 JSON 格式返回分析结果。',
      },
      {
        maxTokens: 2000,
        temperature: 0.3,
      }
    );
    
    // 解析结果
    const analysis = JSON.parse(result);
    
    // 验证和调整视角数
    const recommendedCount = Math.max(
      minViewpoints,
      Math.min(maxViewpoints, analysis.recommendedCount || config.defaultViewpoints.length)
    );
    
    // 生成网格布局
    const gridLayout = calculateGridLayout(recommendedCount);
    
    // 构建视角列表
    let viewpoints: ViewpointSuggestion[] = (analysis.viewpoints || [])
      .slice(0, recommendedCount)
      .map((vp: any, index: number) => ({
        name: vp.name || `视角${index + 1}`,
        nameEn: vp.nameEn || `Viewpoint ${index + 1}`,
        description: vp.description || '',
        gridPosition: { row: Math.floor(index / gridLayout.cols), col: index % gridLayout.cols },
        keyProps: vp.keyProps || [],
        applicableSceneTypes: [sceneType],
        priority: vp.priority || 5,
        confidence: vp.confidence || 0.7,
      }));
    
    // 如果 AI 返回的视角数不够，补充默认视角
    while (viewpoints.length < recommendedCount) {
      const index = viewpoints.length;
      const names = generateViewpointNames(sceneType, index, recommendedCount);
      viewpoints.push({
        ...names,
        gridPosition: { row: Math.floor(index / gridLayout.cols), col: index % gridLayout.cols },
        keyProps: [],
        applicableSceneTypes: [sceneType],
        priority: 3,
        confidence: 0.5,
      });
    }
    
    return {
      recommendedCount,
      viewpoints,
      explanation: analysis.explanation || '基于场景分析推荐的多视角配置',
      gridLayout,
      sceneType: analysis.sceneType || sceneType,
    };
  } catch (error) {
    console.error('[ViewpointAnalyzer] AI analysis failed, using fallback:', error);
    
    // 使用默认配置
    return generateDefaultViewpoints(scene, sceneType, config, minViewpoints, maxViewpoints);
  }
}

/**
 * 生成默认视角配置（AI 失败时的后备方案）
 */
function generateDefaultViewpoints(
  scene: ScriptScene,
  sceneType: string,
  config: { defaultViewpoints: string[]; recommendedGrid: { rows: number; cols: number } },
  minViewpoints: number,
  maxViewpoints: number
): ViewpointAnalysisResult {
  const count = calculateRecommendedCount(
    sceneType,
    scene.keyProps || [],
    false
  );
  
  const recommendedCount = Math.max(minViewpoints, Math.min(maxViewpoints, count));
  const gridLayout = calculateGridLayout(recommendedCount);
  
  const viewpoints: ViewpointSuggestion[] = [];
  
  for (let i = 0; i < recommendedCount; i++) {
    const presetKey = config.defaultViewpoints[i];
    const preset = COMMON_VIEWPOINT_NAMES[presetKey as keyof typeof COMMON_VIEWPOINT_NAMES] || {
      name: `视角${i + 1}`,
      nameEn: `Viewpoint ${i + 1}`,
      description: '场景区域视角',
    };
    
    viewpoints.push({
      ...preset,
      gridPosition: { row: Math.floor(i / gridLayout.cols), col: i % gridLayout.cols },
      keyProps: [],
      applicableSceneTypes: [sceneType],
      priority: 5 - i,
      confidence: 0.8 - i * 0.1,
    });
  }
  
  return {
    recommendedCount,
    viewpoints,
    explanation: '基于场景类型的默认多视角配置',
    gridLayout,
    sceneType,
  };
}

/**
 * 批量分析场景多视角
 */
export async function batchAnalyzeViewpoints(
  scenes: ScriptScene[],
  options: ViewpointAnalysisOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, ViewpointAnalysisResult>> {
  const results = new Map<string, ViewpointAnalysisResult>();
  
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    
    try {
      const analysis = await analyzeSceneViewpoints(scene, options);
      results.set(scene.id, analysis);
    } catch (error) {
      console.error(`[ViewpointAnalyzer] Failed to analyze scene ${scene.id}:`, error);
      // 使用通用配置
      const sceneType = identifySceneType(scene.location, scene.atmosphere);
      const config = SCENE_TYPE_CONFIGS[sceneType] || GENERAL_SCENE_CONFIG;
      results.set(scene.id, generateDefaultViewpoints(
        scene,
        sceneType,
        config,
        options.minViewpoints || 3,
        options.maxViewpoints || 6
      ));
    }
    
    onProgress?.(i + 1, scenes.length);
    
    // 添加延迟避免 API 限流
    if (i < scenes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * 获取视角自动命名建议
 */
export function suggestViewpointNames(
  sceneType: string,
  existingNames: string[] = []
): { name: string; nameEn: string; description: string }[] {
  const config = SCENE_TYPE_CONFIGS[sceneType] || GENERAL_SCENE_CONFIG;
  const suggestions: { name: string; nameEn: string; description: string }[] = [];
  
  for (const presetKey of config.defaultViewpoints) {
    const preset = COMMON_VIEWPOINT_NAMES[presetKey as keyof typeof COMMON_VIEWPOINT_NAMES];
    if (!preset) continue;
    
    // 检查是否已存在
    if (!existingNames.includes(preset.name) && !existingNames.includes(preset.nameEn)) {
      suggestions.push(preset);
    }
  }
  
  return suggestions;
}

/**
 * 验证视角配置的完整性
 */
export function validateViewpointConfiguration(
  viewpoints: SceneViewpoint[],
  gridLayout: { rows: number; cols: number }
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const totalCells = gridLayout.rows * gridLayout.cols;
  
  // 检查视角数是否超出网格
  if (viewpoints.length > totalCells) {
    warnings.push(`视角数 (${viewpoints.length}) 超过了网格容量 (${totalCells})，部分视角将重叠`);
  }
  
  // 检查是否有重叠的位置
  const positions = viewpoints.map(vp => `${vp.gridIndex?.row || 0}-${vp.gridIndex?.col || 0}`);
  const duplicates = positions.filter((pos, idx) => positions.indexOf(pos) !== idx);
  if (duplicates.length > 0) {
    warnings.push(`检测到 ${duplicates.length} 个视角共享同一网格位置`);
  }
  
  // 检查是否包含全景
  const hasOverview = viewpoints.some(vp => 
    vp.name.includes('全景') || 
    vp.nameEn.toLowerCase().includes('overview') ||
    vp.nameEn.toLowerCase().includes('wide')
  );
  if (!hasOverview) {
    warnings.push('建议至少包含一个全景视角以展示场景全貌');
  }
  
  // 检查关键道具覆盖率
  const propsWithoutViewpoint = viewpoints.filter(vp => !vp.keyProps || vp.keyProps.length === 0);
  if (propsWithoutViewpoint.length > viewpoints.length / 2) {
    warnings.push('超过一半的视角缺少关键道具标注');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
