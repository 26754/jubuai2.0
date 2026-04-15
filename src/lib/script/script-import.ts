// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * Script Import Enhancer
 * 
 * 剧本导入增强器 - 支持 Markdown、Fountain、Final Draft 等格式
 */

import { parseMarkdown } from './markdown-parser';
import { parseFountain } from './fountain-parser';

export interface ImportResult {
  /** 剧本数据 */
  script: {
    title: string;
    author?: string;
    scenes: ImportedScene[];
    characters: string[];
    metadata: Record<string, any>;
  };
  /** 解析统计 */
  stats: {
    totalScenes: number;
    totalCharacters: number;
    totalDialogues: number;
    totalActions: number;
    parseErrors: string[];
  };
  /** 原始内容（用于预览） */
  rawContent: string;
}

export interface ImportedScene {
  /** 场景编号 */
  number?: string;
  /** 场景名称 */
  name: string;
  /** 场景描述 */
  description?: string;
  /** 场景位置 */
  location?: string;
  /** 场景时间 */
  time?: string;
  /** 场景类型 */
  sceneType?: string;
  /** 氛围 */
  atmosphere?: string;
  /** 内容段落 */
  content: ContentBlock[];
  /** 原始文本 */
  rawText: string;
}

export interface ContentBlock {
  /** 类型 */
  type: 'action' | 'dialogue' | 'character' | 'parenthetical' | 'transition' | 'note';
  /** 内容 */
  content: string;
  /** 角色名称（对话时） */
  character?: string;
  /** 时间戳 */
  timestamp?: string;
}

// ==================== 导入选项 ====================

export interface ImportOptions {
  /** 导入格式 */
  format: 'markdown' | 'fountain' | 'final_draft' | 'json' | 'auto';
  /** 是否自动识别角色 */
  autoDetectCharacters?: boolean;
  /** 是否保留原始格式 */
  preserveFormatting?: boolean;
  /** 场景分割方式 */
  sceneSplitMode?: 'auto' | 'heading' | 'page_break' | 'scene_header';
  /** 编码 */
  encoding?: string;
}

// ==================== 格式检测 ====================

/**
 * 自动检测导入格式
 */
export function detectFormat(content: string): 'markdown' | 'fountain' | 'final_draft' | 'json' | 'unknown' {
  const trimmed = content.trim();
  
  // JSON 格式检测
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // 不是有效 JSON
    }
  }
  
  // Fountain 格式检测
  if (
    /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed) ||
    /^(FADE IN:|FADE OUT\.|FADE TO:)/i.test(trimmed) ||
    /^!\s*\w/.test(trimmed) || // 强制场景
    /^>\s*.+<$/m.test(trimmed) || // 居中文本
    /^={3,}$/m.test(trimmed) // 场景分割线
  ) {
    return 'fountain';
  }
  
  // Markdown 格式检测
  if (
    /^#{1,6}\s+/m.test(trimmed) || // 标题
    /^\*\*.*\*\*$/m.test(trimmed) || // 粗体
    /^-\s+\w+/m.test(trimmed) || // 列表
    /^```/.test(trimmed) // 代码块
  ) {
    return 'markdown';
  }
  
  // Final Draft 格式检测
  if (
    /<Paragraph Type="/.test(trimmed) ||
    /<Final Draft>/.test(trimmed) ||
    /<Content Type="/.test(trimmed)
  ) {
    return 'final_draft';
  }
  
  return 'unknown';
}

// ==================== 主导入函数 ====================

/**
 * 导入剧本
 */
export async function importScript(
  content: string,
  options: Partial<ImportOptions> = {}
): Promise<ImportResult> {
  const format = options.format === 'auto' 
    ? detectFormat(content) 
    : options.format || detectFormat(content);
  
  let script: ImportResult['script'];
  let parseErrors: string[] = [];
  
  switch (format) {
    case 'markdown':
      ({ script, errors: parseErrors } = parseMarkdown(content, options));
      break;
    case 'fountain':
      ({ script, errors: parseErrors } = parseFountain(content, options));
      break;
    case 'final_draft':
      ({ script, errors: parseErrors } = parseFinalDraft(content, options));
      break;
    case 'json':
      ({ script, errors: parseErrors } = parseJsonScript(content, options));
      break;
    default:
      // 尝试自动解析
      try {
        const result = await autoParse(content, options);
        script = result.script;
        parseErrors = result.errors;
      } catch (error) {
        throw new Error(`无法识别剧本格式。请使用 Markdown、Fountain 或 JSON 格式。`);
      }
  }
  
  // 自动检测角色
  if (options.autoDetectCharacters !== false) {
    const detectedCharacters = extractCharacters(script.scenes);
    script.characters = [...new Set([...script.characters, ...detectedCharacters])];
  }
  
  // 统计信息
  const stats = calculateStats(script, parseErrors);
  
  return {
    script,
    stats,
    rawContent: content,
  };
}

// ==================== 自动解析 ====================

/**
 * 自动解析未知格式
 */
async function autoParse(
  content: string,
  options: Partial<ImportOptions>
): Promise<{ script: ImportResult['script']; errors: string[] }> {
  const errors: string[] = [];
  
  // 尝试提取标题
  const lines = content.split('\n');
  let title = '未命名剧本';
  let author: string | undefined;
  
  for (const line of lines.slice(0, 10)) {
    if (/^#\s*(.+)/.test(line)) {
      title = line.replace(/^#\s*/, '');
      break;
    }
    if (/^(作者|Author):\s*(.+)/i.test(line)) {
      author = line.replace(/^(作者|Author):\s*/i, '');
    }
  }
  
  // 尝试分割场景
  const scenes: ImportedScene[] = [];
  const scenePattern = /(?:第[一二三四五六七八九十百千\d]+[章节集幕]|Scene\s*\d+|场景\d+)/gi;
  
  // 简单按行分割
  let currentScene: ImportedScene | null = null;
  let currentBlock: ContentBlock[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // 检测场景标题
    if (scenePattern.test(trimmed) || /^(INT\.|EXT\.)/i.test(trimmed)) {
      if (currentScene) {
        currentScene.content = [...currentBlock];
        scenes.push(currentScene);
      }
      currentScene = {
        name: trimmed,
        content: [],
        rawText: trimmed,
      };
      currentBlock = [];
      scenePattern.lastIndex = 0;
      continue;
    }
    
    // 累积内容
    if (currentScene) {
      currentBlock.push({
        type: 'action',
        content: trimmed,
      });
    }
  }
  
  // 最后一个场景
  if (currentScene) {
    currentScene.content = currentBlock;
    scenes.push(currentScene);
  }
  
  return {
    script: {
      title,
      author,
      scenes,
      characters: [],
      metadata: {},
    },
    errors,
  };
}

// ==================== JSON 解析 ====================

/**
 * 解析 JSON 格式剧本
 */
function parseJsonScript(
  content: string,
  options: Partial<ImportOptions>
): { script: ImportResult['script']; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const data = JSON.parse(content);
    
    // 支持多种 JSON 结构
    if (data.scenes) {
      return {
        script: {
          title: data.title || '未命名剧本',
          author: data.author,
          scenes: data.scenes.map((s: any) => normalizeScene(s)),
          characters: data.characters || [],
          metadata: data.metadata || {},
        },
        errors,
      };
    }
    
    if (Array.isArray(data)) {
      return {
        script: {
          title: '未命名剧本',
          scenes: data.map((s) => normalizeScene(s)),
          characters: [],
          metadata: {},
        },
        errors,
      };
    }
    
    throw new Error('JSON 结构不支持');
  } catch (error) {
    errors.push(`JSON 解析失败: ${error}`);
    return {
      script: {
        title: '未命名剧本',
        scenes: [],
        characters: [],
        metadata: {},
      },
      errors,
    };
  }
}

/**
 * 标准化场景数据
 */
function normalizeScene(data: any): ImportedScene {
  return {
    number: data.number || data.sceneNumber,
    name: data.name || data.title || data.sceneName || '未命名场景',
    description: data.description || data.desc,
    location: data.location || data.place,
    time: data.time || data.timeOfDay,
    sceneType: data.sceneType || data.type,
    atmosphere: data.atmosphere,
    content: (data.content || data.paragraphs || []).map((c: any) =>
      typeof c === 'string'
        ? { type: 'action' as const, content: c }
        : c
    ),
    rawText: data.rawText || data.originalText || '',
  };
}

// ==================== Final Draft 解析 ====================

/**
 * 解析 Final Draft XML 格式
 */
function parseFinalDraft(
  content: string,
  options: Partial<ImportOptions>
): { script: ImportResult['script']; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // 简单的 XML 解析
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');
    
    // 检查解析错误
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('XML 解析错误');
    }
    
    const contentBlocks = xmlDoc.querySelectorAll('Content');
    const scenes: ImportedScene[] = [];
    let currentScene: ImportedScene | null = null;
    let currentBlocks: ContentBlock[] = [];
    let characters: string[] = [];
    
    contentBlocks.forEach((block) => {
      const type = block.getAttribute('Type') || '';
      const text = block.textContent?.trim() || '';
      
      if (!text) return;
      
      // 场景标题
      if (type === 'Scene Heading') {
        if (currentScene) {
          currentScene.content = [...currentBlocks];
          scenes.push(currentScene);
        }
        
        // 解析场景标题
        const match = text.match(/^(INT\.|EXT\.|I\/E\.)\s*(.+?)\s*-\s*(.+)?$/i);
        currentScene = {
          name: text,
          location: match ? match[2] : text,
          time: match ? match[3] : undefined,
          content: [],
          rawText: text,
        };
        currentBlocks = [];
      } else if (type === 'Character') {
        characters.push(text);
        currentBlocks.push({
          type: 'character',
          content: text,
        });
      } else if (type === 'Dialogue') {
        currentBlocks.push({
          type: 'dialogue',
          content: text,
        });
      } else if (type === 'Parenthetical') {
        currentBlocks.push({
          type: 'parenthetical',
          content: text,
        });
      } else if (type === 'Action') {
        currentBlocks.push({
          type: 'action',
          content: text,
        });
      } else if (type === 'Transition') {
        currentBlocks.push({
          type: 'transition',
          content: text,
        });
      }
    });
    
    // 最后一个场景
    if (currentScene) {
      currentScene.content = currentBlocks;
      scenes.push(currentScene);
    }
    
    return {
      script: {
        title: xmlDoc.querySelector('Title')?.textContent || 'Final Draft 剧本',
        author: xmlDoc.querySelector('Author')?.textContent,
        scenes,
        characters: [...new Set(characters)],
        metadata: {
          format: 'final_draft',
          exportedAt: xmlDoc.querySelector('ExportedAt')?.textContent,
        },
      },
      errors,
    };
  } catch (error) {
    errors.push(`Final Draft 解析失败: ${error}`);
    return {
      script: {
        title: 'Final Draft 剧本',
        scenes: [],
        characters: [],
        metadata: {},
      },
      errors,
    };
  }
}

// ==================== 角色提取 ====================

/**
 * 从场景内容中提取角色
 */
function extractCharacters(scenes: ImportedScene[]): string[] {
  const characters: string[] = [];
  const characterPattern = /^([A-Z][A-Z\s]+)(?:\s*\(.*\))?$/;
  
  for (const scene of scenes) {
    for (const block of scene.content) {
      if (block.type === 'character' || block.type === 'dialogue') {
        const charName = block.character || block.content;
        const match = charName.match(characterPattern);
        if (match) {
          characters.push(match[1].trim());
        }
      }
    }
  }
  
  return [...new Set(characters)];
}

/**
 * 计算统计信息
 */
function calculateStats(
  script: ImportResult['script'],
  errors: string[]
): ImportResult['stats'] {
  let totalDialogues = 0;
  let totalActions = 0;
  
  for (const scene of script.scenes) {
    for (const block of scene.content) {
      if (block.type === 'dialogue') totalDialogues++;
      if (block.type === 'action') totalActions++;
    }
  }
  
  return {
    totalScenes: script.scenes.length,
    totalCharacters: script.characters.length,
    totalDialogues,
    totalActions,
    parseErrors: errors,
  };
}

// ==================== 导出函数 ====================

/**
 * 验证导入结果
 */
export function validateImportResult(result: ImportResult): {
  valid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (result.stats.totalScenes === 0) {
    warnings.push('未检测到任何场景');
    suggestions.push('请检查剧本格式是否正确');
  }
  
  if (result.stats.totalCharacters === 0) {
    suggestions.push('未检测到角色，建议手动添加角色信息');
  }
  
  if (result.stats.parseErrors.length > 0) {
    warnings.push(`${result.stats.parseErrors.length} 个解析错误`);
  }
  
  if (!result.script.title || result.script.title === '未命名剧本') {
    suggestions.push('建议为剧本添加标题');
  }
  
  // 检查场景完整性
  const incompleteScenes = result.script.scenes.filter(
    (s) => !s.content || s.content.length === 0
  );
  if (incompleteScenes.length > 0) {
    warnings.push(`${incompleteScenes.length} 个场景缺少内容`);
  }
  
  return {
    valid: result.stats.totalScenes > 0,
    warnings,
    suggestions,
  };
}

/**
 * 转换导入结果为剧本格式
 */
export function convertToScriptFormat(result: ImportResult): {
  scenes: any[];
  characters: any[];
  metadata: any;
} {
  return {
    scenes: result.script.scenes.map((scene, index) => ({
      id: `scene-${Date.now()}-${index}`,
      name: scene.name,
      number: scene.number || `S${index + 1}`,
      location: scene.location || '',
      time: scene.time || '',
      atmosphere: scene.atmosphere || '',
      description: scene.description || '',
      content: scene.content.map((block, blockIndex) => ({
        id: `block-${index}-${blockIndex}`,
        type: block.type,
        content: block.content,
        character: block.character,
        timestamp: block.timestamp,
      })),
    })),
    characters: result.script.characters.map((name, index) => ({
      id: `char-${Date.now()}-${index}`,
      name,
      description: '',
      appearance: '',
      personality: '',
      dialogueStyle: '',
    })),
    metadata: {
      title: result.script.title,
      author: result.script.author,
      importFormat: detectFormat(result.rawContent),
      importedAt: new Date().toISOString(),
      ...result.script.metadata,
    },
  };
}
