// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 键盘快捷键系统
 * 支持全局快捷键、面板切换快捷键、可配置快捷键
 */

// ==================== 类型定义 ====================

export interface ShortcutAction {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'edit' | 'view' | 'project' | 'ai' | 'system';
  keys: string[];  // 支持多组快捷键
  action: () => void;
  enabled?: () => boolean;  // 可选的启用条件
}

export interface ShortcutGroup {
  id: string;
  name: string;
  shortcuts: ShortcutAction[];
}

// ==================== 快捷键定义 ====================

// 修饰键常量
export const MODIFIERS = {
  CTRL: navigator.platform.includes('Mac') ? '⌘' : 'Ctrl',
  SHIFT: 'Shift',
  ALT: navigator.platform.includes('Mac') ? '⌥' : 'Alt',
  META: navigator.platform.includes('Mac') ? '⌘' : 'Win',
};

// 平台检测
export const isMac = navigator.platform.includes('Mac');

// 快捷键匹配
export function matchShortcut(event: KeyboardEvent, keys: string[]): boolean {
  for (const keyCombo of keys) {
    const parts = keyCombo.toLowerCase().split('+');
    const hasCtrl = parts.includes('ctrl') || parts.includes('cmd') || parts.includes('meta');
    const hasShift = parts.includes('shift');
    const hasAlt = parts.includes('alt') || parts.includes('option');
    
    const keyPart = parts[parts.length - 1];
    const eventKey = event.key.toLowerCase();
    
    // 检查修饰键
    const ctrlMatch = hasCtrl === (event.ctrlKey || event.metaKey);
    const shiftMatch = hasShift === event.shiftKey;
    const altMatch = hasAlt === event.altKey;
    
    // 检查主键（考虑特殊键名映射）
    const keyMap: Record<string, string[]> = {
      'esc': ['escape', 'esc'],
      'space': [' '],
      'enter': ['enter', 'return'],
      'tab': ['tab'],
      'backspace': ['backspace'],
      'delete': ['delete', 'del'],
      'up': ['arrowup'],
      'down': ['arrowdown'],
      'left': ['arrowleft'],
      'right': ['arrowright'],
      'home': ['home'],
      'end': ['end'],
      'pageup': ['pageup'],
      'pagedown': ['pagedown'],
      ',': [','],
      '.': ['.'],
      '/': ['/'],
      '\\': ['\\'],
      ';': [';'],
      "'": ["'"],
      '[': ['['],
      ']': [']'],
      '-': ['-'],
      '=': ['='],
      '`': ['`'],
      ' ': [' '],
    };
    
    const validKeys = keyMap[keyPart] || [keyPart];
    const keyMatch = validKeys.includes(eventKey);
    
    if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
      return true;
    }
  }
  return false;
}

// 格式化快捷键显示
export function formatShortcut(keys: string | string[]): string {
  const keyArray = Array.isArray(keys) ? keys : [keys];
  const parts: string[] = [];
  
  for (const key of keyArray) {
    const combo = key.split('+').map(k => {
      const lower = k.toLowerCase();
      switch (lower) {
        case 'ctrl':
        case 'cmd':
        case 'meta':
          return MODIFIERS.CTRL;
        case 'shift':
          return MODIFIERS.SHIFT;
        case 'alt':
        case 'option':
          return MODIFIERS.ALT;
        case 'escape':
        case 'esc':
          return 'Esc';
        case 'enter':
          return 'Enter';
        case 'backspace':
          return '⌫';
        case 'delete':
          return 'Del';
        case 'arrowup':
        case 'up':
          return '↑';
        case 'arrowdown':
        case 'down':
          return '↓';
        case 'arrowleft':
        case 'left':
          return '←';
        case 'arrowright':
        case 'right':
          return '→';
        case ' ':
        case 'space':
          return 'Space';
        case 'tab':
          return 'Tab';
        default:
          // 大写字母显示为符号
          if (/^[A-Z]$/.test(k)) return k;
          return k.toUpperCase();
      }
    });
    parts.push(combo.join('+'));
  }
  
  return parts.join(' / ');
}

// ==================== 快捷键存储 ====================

const STORAGE_KEY = 'jubuai-shortcuts-settings';

export interface ShortcutSettings {
  enabled: boolean;
  showHints: boolean;
  customShortcuts: Record<string, string[]>;
}

const defaultSettings: ShortcutSettings = {
  enabled: true,
  showHints: true,
  customShortcuts: {},
};

export function loadShortcutSettings(): ShortcutSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('[Shortcuts] Failed to load settings:', e);
  }
  return defaultSettings;
}

export function saveShortcutSettings(settings: ShortcutSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[Shortcuts] Failed to save settings:', e);
  }
}

// ==================== 快捷键动作生成 ====================

type ActionCreator = () => ShortcutAction[];

let actionsCreator: ActionCreator | null = null;

export function registerShortcutActions(creator: ActionCreator): void {
  actionsCreator = creator;
}

export function getAllShortcutActions(): ShortcutAction[] {
  if (actionsCreator) {
    return actionsCreator();
  }
  return [];
}

export function getShortcutActionsByCategory(category: ShortcutAction['category']): ShortcutAction[] {
  return getAllShortcutActions().filter(s => s.category === category);
}

export function getShortcutGroups(): ShortcutGroup[] {
  const actions = getAllShortcutActions();
  const categories: ShortcutAction['category'][] = ['navigation', 'edit', 'view', 'project', 'ai', 'system'];
  const categoryNames: Record<ShortcutAction['category'], string> = {
    navigation: '导航',
    edit: '编辑',
    view: '视图',
    project: '项目',
    ai: 'AI 功能',
    system: '系统',
  };
  
  return categories
    .map(cat => ({
      id: cat,
      name: categoryNames[cat],
      shortcuts: actions.filter(s => s.category === cat),
    }))
    .filter(g => g.shortcuts.length > 0);
}

// ==================== 快捷键执行器 ====================

class ShortcutExecutor {
  private handlers: Map<string, ShortcutAction> = new Map();
  private settings: ShortcutSettings = loadShortcutSettings();
  
  updateSettings(settings: ShortcutSettings): void {
    this.settings = settings;
    saveShortcutSettings(settings);
  }
  
  getSettings(): ShortcutSettings {
    return this.settings;
  }
  
  register(action: ShortcutAction): void {
    for (const keys of action.keys) {
      this.handlers.set(keys.toLowerCase(), action);
    }
  }
  
  unregister(keys: string[]): void {
    for (const key of keys) {
      this.handlers.delete(key.toLowerCase());
    }
  }
  
  handleKeyboardEvent(event: KeyboardEvent): boolean {
    if (!this.settings.enabled) return false;
    
    // 忽略在输入框中的快捷键（除了特定例外）
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.isContentEditable;
    
    // 检查是否是特殊的允许快捷键
    const escapeAllowed = ['escape', 'esc'].includes(event.key.toLowerCase());
    if (isInputField && !escapeAllowed) return false;
    
    // 尝试匹配每个已注册的快捷键
    for (const [, action] of this.handlers) {
      // 检查启用条件
      if (action.enabled && !action.enabled()) continue;
      
      if (matchShortcut(event, action.keys)) {
        event.preventDefault();
        event.stopPropagation();
        action.action();
        console.log('[Shortcuts] Executed:', action.name, action.keys);
        return true;
      }
    }
    
    return false;
  }
}

export const shortcutExecutor = new ShortcutExecutor();

// ==================== 常用快捷键预设 ====================

export const PRESET_SHORTCUTS = {
  // 导航快捷键
  NAV_DASHBOARD: ['1'],
  NAV_OVERVIEW: ['2'],
  NAV_SCRIPT: ['3'],
  NAV_CHARACTERS: ['4'],
  NAV_SCENES: ['5'],
  NAV_DIRECTOR: ['6'],
  NAV_ASSETS: ['7'],
  NAV_EXPORT: ['8'],
  
  // 编辑快捷键
  EDIT_UNDO: [isMac ? 'cmd+z' : 'ctrl+z'],
  EDIT_REDO: [isMac ? 'cmd+shift+z' : 'ctrl+shift+z', isMac ? 'cmd+y' : 'ctrl+y'],
  EDIT_SAVE: [isMac ? 'cmd+s' : 'ctrl+s'],
  EDIT_COPY: [isMac ? 'cmd+c' : 'ctrl+c'],
  EDIT_PASTE: [isMac ? 'cmd+v' : 'ctrl+v'],
  EDIT_CUT: [isMac ? 'cmd+x' : 'ctrl+x'],
  EDIT_SELECT_ALL: [isMac ? 'cmd+a' : 'ctrl+a'],
  EDIT_DELETE: ['delete', 'backspace'],
  
  // 视图快捷键
  VIEW_FULLSCREEN: ['f11', 'escape'],
  VIEW_ZOOM_IN: [isMac ? 'cmd+=' : 'ctrl+=', isMac ? 'cmd++' : 'ctrl++'],
  VIEW_ZOOM_OUT: [isMac ? 'cmd+-' : 'ctrl+-'],
  VIEW_RESET_ZOOM: [isMac ? 'cmd+0' : 'ctrl+0'],
  
  // 项目快捷键
  PROJECT_NEW: [isMac ? 'cmd+shift+n' : 'ctrl+shift+n'],
  PROJECT_OPEN: [isMac ? 'cmd+o' : 'ctrl+o'],
  PROJECT_SAVE: [isMac ? 'cmd+s' : 'ctrl+s'],
  
  // AI 快捷键
  AI_GENERATE: [isMac ? 'cmd+enter' : 'ctrl+enter'],
  AI_CANCEL: ['escape'],
  
  // 系统快捷键
  SYSTEM_SETTINGS: [isMac ? 'cmd+,' : 'ctrl+,'],
  SYSTEM_SEARCH: [isMac ? 'cmd+k' : 'ctrl+k'],
  SYSTEM_HELP: ['f1'],
};
