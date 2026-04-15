// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * Fountain Script Parser
 * 
 * Fountain 格式剧本解析器
 * 
 * Fountain 是一种纯文本 screenplay 格式规范
 * 官方网站: http://fountain.io
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

// ==================== Fountain 解析器 ====================

/**
 * 解析 Fountain 格式剧本
 */
export function parseFountain(
  content: string,
  options: Partial<ImportOptions> = {}
): ParseResult {
  const errors: string[] = [];
  
  // 预处理：规范化换行符
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  
  // 提取标题页元数据
  const metadata: Record<string, string> = {};
  let title = '未命名剧本';
  let author: string | undefined;
  let contentStartIndex = 0;
  
  // 检测标题页（用空行包围的 Key: Value 对）
  const frontmatterEnd = findFrontmatterEnd(lines);
  if (frontmatterEnd > 0) {
    for (let i = 0; i < frontmatterEnd; i++) {
      const line = lines[i].trim();
      const match = line.match(/^(Title|Author|Credit|Source|Draft date|Contact|Copyright):\s*(.*)$/i);
      if (match) {
        const key = match[1].toLowerCase();
        const value = match[2].trim();
        metadata[key] = value;
        
        if (key === 'title') title = value;
        if (key === 'author') author = value;
      }
    }
    contentStartIndex = frontmatterEnd + 1;
  }
  
  // 解析内容
  const scenes: ImportedScene[] = [];
  let currentScene: ImportedScene | null = null;
  let currentBlocks: ContentBlock[] = [];
  let sceneCount = 0;
  let inDialogue = false;
  let lastCharacter: string | undefined;
  
  for (let i = contentStartIndex; i < lines.length; i++) {
    let line = lines[i];
    let rawLine = line;
    
    // 跳过空行（但可能表示段落结束）
    if (isBlank(line)) {
      if (inDialogue) {
        inDialogue = false;
      }
      continue;
    }
    
    // 检测注释
    if (isComment(line)) {
      continue;
    }
    
    // 检测场景标题
    if (isSceneHeading(line)) {
      // 保存当前场景
      if (currentScene) {
        currentScene.content = [...currentBlocks];
        scenes.push(currentScene);
      }
      
      // 创建新场景
      sceneCount++;
      currentScene = parseSceneHeading(line, sceneCount);
      currentBlocks = [];
      inDialogue = false;
      continue;
    }
    
    // 检测居中文本
    if (isCentered(line)) {
      currentBlocks.push({
        type: 'action',
        content: stripCentered(line),
      });
      continue;
    }
    
    // 检测分段标题
    if (isSection(line)) {
      // 可以选择性地创建子场景
      continue;
    }
    
    // 检测Synopsis
    if (isSynopsis(line)) {
      if (currentScene) {
        const synopsis = stripSynopsis(line);
        currentScene.description = currentScene.description
          ? `${currentScene.description}\n${synopsis}`
          : synopsis;
      }
      continue;
    }
    
    // 跳过标题页
    if (isPageBreak(line) && i < 10) {
      continue;
    }
    
    // 处理对话
    if (currentScene) {
      const block = parseFountainBlock(
        line,
        rawLine,
        lines,
        i,
        inDialogue,
        lastCharacter
      );
      
      if (block) {
        currentBlocks.push(block);
        
        if (block.type === 'character') {
          lastCharacter = block.content;
          inDialogue = true;
        } else if (block.type === 'dialogue' && !block.character) {
          block.character = lastCharacter;
        } else if (block.type !== 'parenthetical') {
          inDialogue = false;
        }
      }
    }
  }
  
  // 保存最后一个场景
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

// ==================== Fountain 格式识别函数 ====================

/**
 * 查找 frontmatter 结束位置
 */
function findFrontmatterEnd(lines: string[]): number {
  let foundFirst = false;
  
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    if (lines[i].trim() === '') {
      if (foundFirst) {
        return i;
      }
      // 检查是否有 frontmatter
      if (i === 0 && lines[i + 1]?.match(/^Title:/i)) {
        foundFirst = true;
      } else if (lines[i - 1]?.match(/^Copyright:/i)) {
        return i + 1;
      }
    }
  }
  
  return 0;
}

/**
 * 判断是否为空行
 */
function isBlank(line: string): boolean {
  return line.trim() === '';
}

/**
 * 判断是否是注释
 */
function isComment(line: string): boolean {
  return line.trim().startsWith('[[') && line.trim().endsWith(']]');
}

/**
 * 判断是否是场景标题
 */
function isSceneHeading(line: string): boolean {
  const trimmed = line.trim();
  
  // 强制场景：以 ! 开头
  if (trimmed.startsWith('!')) {
    return true;
  }
  
  // 标准场景：INT./EXT./INT./I/E. 开头
  if (/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/i.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * 判断是否是居中文本
 */
function isCentered(line: string): boolean {
  return line.trim().startsWith('>') && !line.trim().endsWith('<');
}

/**
 * 移除居中标记
 */
function stripCentered(line: string): string {
  return line.trim().slice(1).trim();
}

/**
 * 判断是否是分段标题
 */
function isSection(line: string): boolean {
  return /^#{1,6}\s+/.test(line.trim());
}

/**
 * 判断是否是Synopsis
 */
function isSynopsis(line: string): boolean {
  return line.trim().startsWith('=') && !line.trim().startsWith('==');
}

/**
 * 移除Synopsis标记
 */
function stripSynopsis(line: string): string {
  return line.trim().slice(1).trim();
}

/**
 * 判断是否是页面分割
 */
function isPageBreak(line: string): boolean {
  return /^={3,}$/.test(line.trim());
}

// ==================== 解析函数 ====================

/**
 * 解析场景标题
 */
function parseSceneHeading(line: string, count: number): ImportedScene {
  const trimmed = line.trim();
  const isForced = trimmed.startsWith('!');
  
  // 移除强制标记
  const heading = isForced ? trimmed.slice(1) : trimmed;
  
  // 解析格式: "INT./EXT. 位置 - 时间"
  const match = heading.match(
    /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s*(.+?)(?:\s*[-–—]\s*(.+))?$/i
  );
  
  const result: ImportedScene = {
    name: heading,
    number: `S${count}`,
    content: [],
    rawText: line,
  };
  
  if (match) {
    const [, type, location, time] = match;
    result.location = location.trim();
    result.time = time?.trim();
    result.sceneType = type.toUpperCase().includes('INT') ? '室内' : '室外';
    result.name = `${type} ${location}`;
  }
  
  return result;
}

/**
 * 解析 Fountain 内容块
 */
function parseFountainBlock(
  line: string,
  rawLine: string,
  allLines: string[],
  currentIndex: number,
  inDialogue: boolean,
  lastCharacter: string | undefined
): ContentBlock | null {
  const trimmed = line.trim();
  
  if (!trimmed) return null;
  
  // 转场：以 > 开头，以 < 结尾
  if (trimmed.startsWith('>') && trimmed.endsWith('<')) {
    return {
      type: 'transition',
      content: trimmed.slice(1, -1).trim(),
    };
  }
  
  // 转场：TO: 结尾
  if (/^[A-Z\s]+TO:$/.test(trimmed)) {
    return {
      type: 'transition',
      content: trimmed,
    };
  }
  
  // 旁白：包含在 () 中
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    // 判断是旁白还是角色指示
    if (inDialogue || lastCharacter) {
      return {
        type: 'parenthetical',
        content: trimmed.slice(1, -1),
      };
    }
    return {
      type: 'action',
      content: trimmed.slice(1, -1),
    };
  }
  
  // 对话前角色名
  const characterMatch = trimmed.match(/^([A-Z][A-Z\s]+)(\s*\(.*\))?$/);
  if (characterMatch) {
    const [, name, extension] = characterMatch;
    return {
      type: 'character',
      content: name.trim(),
      character: extension ? `${name.trim()} ${extension}` : undefined,
    };
  }
  
  // 对话内容
  if (inDialogue && lastCharacter) {
    return {
      type: 'dialogue',
      content: trimmed,
      character: lastCharacter,
    };
  }
  
  // 混合动作/描述
  return {
    type: 'action',
    content: trimmed,
  };
}

/**
 * 从所有场景中提取角色
 */
function extractAllCharacters(scenes: ImportedScene[]): string[] {
  const characters = new Set<string>();
  
  for (const scene of scenes) {
    for (const block of scene.content) {
      if (block.type === 'character') {
        characters.add(block.content);
      }
    }
  }
  
  return Array.from(characters).sort();
}
