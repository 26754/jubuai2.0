// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * Markdown Script Parser
 * 
 * Markdown 格式剧本解析器
 */

import type { ImportOptions, ImportedScene, ContentBlock } from './script-import';

interface ParseResult {
  script: {
    title: string;
    author?: string;
    scenes: ImportedScene[];
    characters: string[];
    metadata: Record<string, any>;
  };
  errors: string[];
}

// ==================== Markdown 解析器 ====================

/**
 * 解析 Markdown 格式剧本
 */
export function parseMarkdown(
  content: string,
  options: Partial<ImportOptions> = {}
): ParseResult {
  const errors: string[] = [];
  
  // 预处理内容
  const lines = content.split('\n');
  
  // 提取标题和元数据
  let title = '未命名剧本';
  let author: string | undefined;
  const metadata: Record<string, any> = {};
  
  // 提取 frontmatter
  let frontmatter: Record<string, any> = {};
  let contentStartIndex = 0;
  
  if (lines[0]?.trim() === '---') {
    let i = 1;
    while (i < lines.length && lines[i]?.trim() !== '---') {
      const [key, ...valueParts] = lines[i].split(':');
      if (key && valueParts.length > 0) {
        frontmatter[key.trim()] = valueParts.join(':').trim();
      }
      i++;
    }
    contentStartIndex = i + 1;
    title = frontmatter.title || title;
    author = frontmatter.author;
    metadata.frontmatter = frontmatter;
  } else {
    // 从内容中提取标题
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (/^#\s+(.+)/.test(line)) {
        title = line.replace(/^#\s+/, '');
        contentStartIndex = i + 1;
        break;
      }
      if (/^(作者|Author):\s*(.+)/i.test(line)) {
        author = line.replace(/^(作者|Author):\s*/i, '');
        contentStartIndex = i + 1;
      }
    }
  }
  
  // 解析场景
  const scenes: ImportedScene[] = [];
  let currentScene: ImportedScene | null = null;
  let currentBlocks: ContentBlock[] = [];
  let sceneCount = 0;
  
  for (let i = contentStartIndex; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // 跳过空行
    if (!trimmed) continue;
    
    // 检测场景标题（# 标题或 **加粗标题**）
    const isSceneHeading = /^#{1,3}\s+(.+)/.test(trimmed) ||
                          /^\*\*(.+?)\*\*/.test(trimmed) ||
                          /^(Scene\s*\d+[:：]?\s*)?(INT\.|EXT\.|I\/E\.)/i.test(trimmed);
    
    if (isSceneHeading) {
      // 保存当前场景
      if (currentScene) {
        currentScene.content = [...currentBlocks];
        scenes.push(currentScene);
      }
      
      // 创建新场景
      sceneCount++;
      const sceneName = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      const parsedScene = parseSceneHeader(sceneName, sceneCount);
      
      currentScene = {
        ...parsedScene,
        content: [],
        rawText: line,
      };
      currentBlocks = [];
      continue;
    }
    
    // 解析内容块
    if (currentScene) {
      const block = parseMarkdownBlock(trimmed, lines, i);
      if (block) {
        currentBlocks.push(block);
        
        // 提取角色名
        if (block.type === 'character') {
          const charName = extractCharacterName(block.content);
          if (charName) {
            currentScene.description = currentScene.description 
              ? `${currentScene.description}\n角色: ${charName}`
              : `角色: ${charName}`;
          }
        }
      }
    }
  }
  
  // 最后一个场景
  if (currentScene) {
    currentScene.content = currentBlocks;
    scenes.push(currentScene);
  }
  
  // 提取所有角色
  const characters = extractAllCharacters(scenes);
  
  return {
    script: {
      title,
      author,
      scenes,
      characters,
      metadata,
    },
    errors,
  };
}

// ==================== 辅助函数 ====================

/**
 * 解析场景标题
 */
function parseSceneHeader(header: string, count: number): Partial<ImportedScene> {
  const result: Partial<ImportedScene> = {
    name: header,
    number: `S${count}`,
  };
  
  // 解析格式: "场景名称 - 时间" 或 "INT. 地点 - 时间"
  const match = header.match(/^(INT\.|EXT\.|I\/E\.|室内|室外)?\.?\s*(.+?)(?:\s*[-–—]\s*(.+))?$/i);
  
  if (match) {
    result.location = match[2]?.trim();
    result.time = match[3]?.trim();
    
    // 设置场景类型
    const type = header.toUpperCase().startsWith('INT') 
      ? '室内' 
      : header.toUpperCase().startsWith('EXT') 
        ? '室外' 
        : undefined;
    if (type) {
      result.sceneType = type;
    }
  }
  
  // 尝试识别氛围关键词
  const atmosphereKeywords = [
    '白天', '夜晚', '清晨', '黄昏', '日落', '日出',
    '明亮', '昏暗', '浪漫', '紧张', '神秘', '恐怖',
  ];
  
  for (const keyword of atmosphereKeywords) {
    if (header.includes(keyword)) {
      result.atmosphere = keyword;
      break;
    }
  }
  
  return result;
}

/**
 * 解析 Markdown 内容块
 */
function parseMarkdownBlock(
  line: string,
  allLines: string[],
  currentIndex: number
): ContentBlock | null {
  const trimmed = line.trim();
  
  if (!trimmed) return null;
  
  // 对话格式: 角色名: 台词 或 **角色名** 台词
  const dialogueMatch = trimmed.match(/^\*\*(.+?)\*\*\s*[:：]\s*(.+)/) ||
                        trimmed.match(/^(【(.+?)】)\s*(.+)/) ||
                        trimmed.match(/^《(.+?)》\s*(.+)/);
  
  if (dialogueMatch) {
    return {
      type: 'dialogue',
      content: dialogueMatch[dialogueMatch.length - 1],
      character: dialogueMatch[1] || dialogueMatch[2],
    };
  }
  
  // 角色名行（单独一行，全大写或特殊格式）
  if (/^\*\*(.+?)\*\*$/.test(trimmed) || /^【(.+?)】$/.test(trimmed)) {
    const charMatch = trimmed.match(/^\*\*(.+?)\*\*$/) || trimmed.match(/^【(.+?)】$/);
    return {
      type: 'character',
      content: charMatch?.[1] || trimmed,
    };
  }
  
  // 旁白或动作描述
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return {
      type: 'action',
      content: trimmed.slice(1, -1),
    };
  }
  
  // 转场
  if (/^(FADE|TRANSITION|CUT TO|DISSOLVE TO|SMASH CUT)/i.test(trimmed)) {
    return {
      type: 'transition',
      content: trimmed,
    };
  }
  
  // 注释
  if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
    return {
      type: 'note',
      content: trimmed.slice(4, -3).trim(),
    };
  }
  
  // 普通动作/描述
  return {
    type: 'action',
    content: trimmed,
  };
}

/**
 * 提取角色名
 */
function extractCharacterName(content: string): string | null {
  // 移除装饰符号
  const cleaned = content
    .replace(/\*\*/g, '')
    .replace(/【|】/g, '')
    .replace(/《|》/g, '')
    .trim();
  
  // 检查是否像角色名（全大写或驼峰）
  if (/^[A-Z][A-Z\s]+$/.test(cleaned) || /^[A-Z][a-z]+[A-Z]/.test(cleaned)) {
    return cleaned;
  }
  
  return null;
}

/**
 * 从所有场景中提取角色
 */
function extractAllCharacters(scenes: ImportedScene[]): string[] {
  const characters = new Set<string>();
  
  for (const scene of scenes) {
    for (const block of scene.content) {
      if (block.type === 'character' || block.type === 'dialogue') {
        const name = block.character || extractCharacterName(block.content);
        if (name) {
          characters.add(name);
        }
      }
    }
  }
  
  return Array.from(characters).sort();
}
