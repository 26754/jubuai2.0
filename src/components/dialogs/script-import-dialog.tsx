// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.

/**
 * Script Import Dialog
 * 
 * 剧本导入对话框 - 支持多种格式导入
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileUp,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileJson,
  FileCode,
  Eye,
  Settings,
  Info,
  X,
} from 'lucide-react';

import {
  importScript,
  detectFormat,
  validateImportResult,
  convertToScriptFormat,
  type ImportResult,
  type ImportOptions,
} from '@/lib/script/script-import';

interface ScriptImportDialogProps {
  /** 是否可见 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 导入成功回调 */
  onImportSuccess: (data: ReturnType<typeof convertToScriptFormat>) => void;
}

// 支持的格式
const SUPPORTED_FORMATS = [
  {
    id: 'markdown',
    name: 'Markdown',
    description: '使用 # 标题、**加粗** 等格式的剧本',
    icon: FileText,
    extensions: ['.md', '.markdown', '.txt'],
    example: `# 第一集：相遇

## 第一场：咖啡馆

**咖啡馆内，白天**

小明坐在角落，手里握着一杯咖啡。

**小明**：今天天气真好。

**服务员**：请问需要点什么？
`,
  },
  {
    id: 'fountain',
    name: 'Fountain',
    description: '专业的 screenplay 格式',
    icon: FileCode,
    extensions: ['.fountain', '.txt'],
    example: `Title: 第一集
Author: 作者名

---

INT. 咖啡馆 - 白天

小明坐在角落，手里握着一杯咖啡。

小明
今天天气真好。

服务员
请问需要点什么？
`,
  },
  {
    id: 'json',
    name: 'JSON',
    description: '结构化的 JSON 格式剧本',
    icon: FileJson,
    extensions: ['.json'],
    example: `{
  "title": "第一集",
  "scenes": [
    {
      "name": "第一场",
      "location": "咖啡馆",
      "time": "白天",
      "content": [
        { "type": "action", "content": "小明坐在角落" },
        { "type": "dialogue", "character": "小明", "content": "你好" }
      ]
    }
  ]
}`,
  },
];

// 格式检测徽章
function FormatBadge({ format }: { format: string }) {
  const config = SUPPORTED_FORMATS.find((f) => f.id === format);
  if (!config) return null;
  
  const Icon = config.icon;
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="w-3 h-3" />
      {config.name}
    </Badge>
  );
}

export function ScriptImportDialog({
  open,
  onClose,
  onImportSuccess,
}: ScriptImportDialogProps) {
  // 状态
  const [activeTab, setActiveTab] = useState<string>('paste');
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<string>('auto');
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  
  // 选项
  const [autoDetectCharacters, setAutoDetectCharacters] = useState(true);
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 检测格式
  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    if (format === 'auto' && value.trim()) {
      const detected = detectFormat(value);
      setDetectedFormat(detected === 'unknown' ? null : detected);
    }
  }, [format]);
  
  // 读取文件
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        setContent(text);
        
        // 自动检测格式
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'md' || ext === 'markdown') {
          setFormat('markdown');
        } else if (ext === 'fountain') {
          setFormat('fountain');
        } else if (ext === 'json') {
          setFormat('json');
        } else {
          setFormat('auto');
          const detected = detectFormat(text);
          setDetectedFormat(detected === 'unknown' ? null : detected);
        }
        
        setActiveTab('paste');
      } catch (error) {
        console.error('[ScriptImportDialog] File read error:', error);
        setErrors(['文件读取失败']);
      }
    },
    []
  );
  
  // 预览导入结果
  const handlePreview = useCallback(async () => {
    if (!content.trim()) {
      setErrors(['请输入或上传剧本内容']);
      return;
    }
    
    setIsImporting(true);
    setErrors([]);
    setImportResult(null);
    
    try {
      const options: Partial<ImportOptions> = {
        format: format as any,
        autoDetectCharacters,
        preserveFormatting,
      };
      
      const result = await importScript(content, options);
      setImportResult(result);
      
      // 验证结果
      const validation = validateImportResult(result);
      if (!validation.valid) {
        setErrors(validation.warnings);
      }
    } catch (error) {
      console.error('[ScriptImportDialog] Import error:', error);
      setErrors([`导入失败: ${error}`]);
    } finally {
      setIsImporting(false);
    }
  }, [content, format, autoDetectCharacters, preserveFormatting]);
  
  // 确认导入
  const handleImport = useCallback(() => {
    if (!importResult) {
      handlePreview().then(() => {
        // 验证通过后自动导入
        setTimeout(() => {
          if (importResult) {
            const converted = convertToScriptFormat(importResult);
            onImportSuccess(converted);
            handleClose();
          }
        }, 100);
      });
    } else {
      const converted = convertToScriptFormat(importResult);
      onImportSuccess(converted);
      handleClose();
    }
  }, [importResult, handlePreview, onImportSuccess]);
  
  // 关闭并重置
  const handleClose = useCallback(() => {
    setContent('');
    setFormat('auto');
    setDetectedFormat(null);
    setImportResult(null);
    setErrors([]);
    onClose();
  }, [onClose]);
  
  // 格式化预览
  const renderPreview = () => {
    if (!importResult) return null;
    
    const { script, stats } = importResult;
    
    return (
      <div className="space-y-4">
        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="bg-muted/30">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.totalScenes}</div>
              <div className="text-xs text-muted-foreground">场景</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.totalCharacters}</div>
              <div className="text-xs text-muted-foreground">角色</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.totalDialogues}</div>
              <div className="text-xs text-muted-foreground">对话</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.totalActions}</div>
              <div className="text-xs text-muted-foreground">动作</div>
            </CardContent>
          </Card>
        </div>
        
        {/* 角色列表 */}
        {script.characters.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">检测到的角色</h4>
            <div className="flex flex-wrap gap-1">
              {script.characters.slice(0, 10).map((char, i) => (
                <Badge key={i} variant="secondary">
                  {char}
                </Badge>
              ))}
              {script.characters.length > 10 && (
                <Badge variant="outline">+{script.characters.length - 10}</Badge>
              )}
            </div>
          </div>
        )}
        
        {/* 场景预览 */}
        <div>
          <h4 className="text-sm font-medium mb-2">场景预览</h4>
          <ScrollArea className="h-[200px] rounded-md border p-2">
            <div className="space-y-2">
              {script.scenes.slice(0, 5).map((scene, i) => (
                <Card key={i} className="bg-muted/20">
                  <CardContent className="p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {scene.number} {scene.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {scene.location && <span>{scene.location}</span>}
                          {scene.time && <span>- {scene.time}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {scene.content.length} 段
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {script.scenes.length > 5 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  还有 {script.scenes.length - 5} 个场景...
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            导入剧本
          </DialogTitle>
          <DialogDescription>
            支持 Markdown、Fountain、JSON 等多种格式
          </DialogDescription>
        </DialogHeader>
        
        {/* 格式选择 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>格式</Label>
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                if (e.target.value !== 'auto') {
                  setDetectedFormat(null);
                }
              }}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="auto">自动检测</option>
              <option value="markdown">Markdown</option>
              <option value="fountain">Fountain</option>
              <option value="json">JSON</option>
            </select>
          </div>
          
          {detectedFormat && format === 'auto' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">检测到：</span>
              <FormatBadge format={detectedFormat} />
            </div>
          )}
        </div>
        
        {/* 导入方式 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste" className="gap-1">
              <FileText className="w-4 h-4" />
              粘贴内容
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1">
              <Upload className="w-4 h-4" />
              上传文件
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="paste" className="m-0 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden flex flex-col">
              <Textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="在此粘贴剧本内容，或从支持的格式文件中复制..."
                className="flex-1 min-h-[200px] font-mono text-sm"
              />
              
              {detectedFormat && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>自动检测为 {detectedFormat.toUpperCase()} 格式</span>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="m-0">
            <Card className="border-dashed">
              <CardContent className="p-8 flex flex-col items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown,.fountain,.json,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  选择文件
                </Button>
                <div className="text-sm text-muted-foreground text-center">
                  支持格式：.md, .markdown, .fountain, .json, .txt
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* 选项 */}
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-detect"
                  checked={autoDetectCharacters}
                  onCheckedChange={setAutoDetectCharacters}
                />
                <Label htmlFor="auto-detect" className="text-sm cursor-pointer">
                  自动检测角色
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="preserve-format"
                  checked={preserveFormatting}
                  onCheckedChange={setPreserveFormatting}
                />
                <Label htmlFor="preserve-format" className="text-sm cursor-pointer">
                  保留格式
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 错误信息 */}
        {errors.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                <div className="space-y-1">
                  {errors.map((error, i) => (
                    <p key={i} className="text-sm text-amber-700 dark:text-amber-400">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 预览结果 */}
        {importResult && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" />
                导入预览
              </CardTitle>
            </CardHeader>
            <CardContent>{renderPreview()}</CardContent>
          </Card>
        )}
        
        {/* 操作按钮 */}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={!content.trim() || isImporting}
          >
            {isImporting ? (
              <>
                <Progress className="w-4 h-4 animate-spin mr-2" />
                解析中...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                预览
              </>
            )}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!importResult || !importResult.stats.totalScenes}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            确认导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
