// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 快捷键设置面板
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Keyboard, Search, Save, Undo, Redo, Eye, Zap, Settings2, ChevronRight } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { shortcutExecutor, formatShortcut, getShortcutGroups, ShortcutSettings, ShortcutGroup } from '@/lib/keyboard-shortcuts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface KeyboardShortcutsPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function KeyboardShortcutsPanel({ open, onOpenChange }: KeyboardShortcutsPanelProps) {
  const [settings, setSettings] = useState<ShortcutSettings>(() => shortcutExecutor.getSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['navigation', 'edit']));
  
  const updateSettings = useCallback((newSettings: ShortcutSettings) => {
    setSettings(newSettings);
    shortcutExecutor.updateSettings(newSettings);
  }, []);
  
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);
  
  // 过滤快捷键
  const filteredGroups = searchQuery.trim()
    ? getShortcutGroups()
        .map(group => ({
          ...group,
          shortcuts: group.shortcuts.filter(
            s => s.name.includes(searchQuery) || 
                 s.description.includes(searchQuery) ||
                 s.keys.some(k => k.includes(searchQuery.toLowerCase()))
          ),
        }))
        .filter(g => g.shortcuts.length > 0)
    : getShortcutGroups();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            键盘快捷键
          </DialogTitle>
        </DialogHeader>
        
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索快捷键..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* 设置选项 */}
        <div className="flex items-center gap-4 py-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => updateSettings({ ...settings, enabled: e.target.checked })}
              className="rounded border-input"
            />
            <span className="text-sm">启用快捷键</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showHints}
              onChange={(e) => updateSettings({ ...settings, showHints: e.target.checked })}
              className="rounded border-input"
            />
            <span className="text-sm">显示快捷键提示</span>
          </label>
        </div>
        
        <Separator />
        
        {/* 快捷键列表 */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2">
            {filteredGroups.map(group => (
              <Collapsible
                key={group.id}
                open={expandedGroups.has(group.id)}
                onOpenChange={() => toggleGroup(group.id)}
              >
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">{group.name}</span>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expandedGroups.has(group.id) ? 'rotate-90' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div className="space-y-1 pl-2">
                    {group.shortcuts.map(shortcut => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                      >
                        <div>
                          <div className="text-sm">{shortcut.name}</div>
                          <div className="text-xs text-muted-foreground">{shortcut.description}</div>
                        </div>
                        <div className="flex gap-1">
                          {shortcut.keys.map((key, i) => (
                            <Badge key={i} variant="secondary" className="font-mono text-xs">
                              {formatShortcut(key)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
            
            {filteredGroups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Keyboard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>没有找到匹配的快捷键</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 快捷键提示按钮 ====================

interface ShortcutHintProps {
  actionId: string;
  children: React.ReactNode;
  showShortcut?: boolean;
}

export function ShortcutHint({ actionId, children, showShortcut = true }: ShortcutHintProps) {
  const [shortcut, setShortcut] = useState<string | null>(null);
  
  useEffect(() => {
    const actions = getShortcutGroups()
      .flatMap(g => g.shortcuts)
      .filter(s => s.id === actionId);
    
    if (actions.length > 0 && actions[0].keys.length > 0) {
      setShortcut(formatShortcut(actions[0].keys[0]));
    }
  }, [actionId]);
  
  if (!showShortcut || !shortcut) {
    return <>{children}</>;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{children}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
              {shortcut}
            </kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ==================== 快捷键指示器 ====================

export function KeyboardShortcutIndicator() {
  const [showHints] = useState(() => shortcutExecutor.getSettings().showHints);
  
  if (!showHints) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-muted/80 backdrop-blur-sm rounded-full text-xs text-muted-foreground cursor-help">
            <Keyboard className="w-3 h-3" />
            <span>?</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>按 <kbd className="px-1 bg-muted rounded">?</kbd> 查看快捷键</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ==================== 快捷键命令面板 ====================

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: Array<{
    id: string;
    name: string;
    shortcut?: string;
    category?: string;
    action: () => void;
  }>;
}

export function CommandPalette({ open, onOpenChange, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const filteredCommands = query.trim()
    ? commands.filter(cmd =>
        cmd.name.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;
  
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);
  
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);
  
  const executeCommand = useCallback((index: number) => {
    const command = filteredCommands[index];
    if (command) {
      command.action();
      onOpenChange(false);
    }
  }, [filteredCommands, onOpenChange]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl gap-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="输入命令..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 h-10"
            autoFocus
          />
        </div>
        
        <ScrollArea className="max-h-[300px]">
          <div className="py-2">
            {filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => executeCommand(index)}
                className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-muted/50 ${
                  index === selectedIndex ? 'bg-muted/50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {cmd.category && (
                    <Badge variant="outline" className="text-xs">
                      {cmd.category}
                    </Badge>
                  )}
                  <span>{cmd.name}</span>
                </div>
                {cmd.shortcut && (
                  <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))}
            
            {filteredCommands.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>没有找到匹配的命令</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
