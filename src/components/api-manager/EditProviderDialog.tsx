// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * Edit Provider Dialog
 * For editing existing API providers
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { IProvider } from "@/lib/api-key-manager";
import { getApiKeyCount } from "@/lib/api-key-manager";
import { Loader2, CheckCircle2, XCircle, Globe } from "lucide-react";
import { corsFetch } from "@/lib/cors-fetch";

interface EditProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: IProvider | null;
  onSave: (provider: IProvider) => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

interface TestResult {
  status: 'success' | 'error';
  statusCode?: number;
  responseTime?: number;
  errorMessage?: string;
}

export function EditProviderDialog({
  open,
  onOpenChange,
  provider,
  onSave,
}: EditProviderDialogProps) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Initialize form when provider changes
  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setBaseUrl(provider.baseUrl);
      setApiKey(provider.apiKey);
      // 加载已有模型
      setModel(provider.model?.join(', ') || '');
      // 重置检测状态
      setTestStatus('idle');
      setTestResult(null);
    }
  }, [provider]);

  // 测试链接连通性
  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      toast.error("请输入 Base URL");
      return;
    }

    setTestStatus('testing');
    setTestResult(null);
    const startTime = Date.now();

    try {
      // 清理 URL
      let testUrl = baseUrl.trim();
      if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
        testUrl = 'https://' + testUrl;
      }
      // 移除末尾斜杠并添加 /v1/models
      testUrl = testUrl.replace(/\/$/, '') + '/v1/models';

      // 使用 corsFetch 测试连接（支持跨域）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await corsFetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey.trim() ? { 'Authorization': `Bearer ${apiKey.split(/[,\n]/)[0].trim()}` } : {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok || response.status === 401 || response.status === 403) {
        // 401/403 表示服务可用但认证失败，这也是可以接受的
        setTestStatus('success');
        setTestResult({
          status: 'success',
          statusCode: response.status,
          responseTime,
        });
        toast.success(`连接成功 (${response.status}) - ${responseTime}ms`);
      } else {
        setTestStatus('error');
        setTestResult({
          status: 'error',
          statusCode: response.status,
          responseTime,
          errorMessage: `HTTP ${response.status}`,
        });
        toast.error(`连接失败: HTTP ${response.status}`);
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      setTestStatus('error');
      
      let errorMessage = '无法连接到服务器';
      if (error.name === 'AbortError') {
        errorMessage = '连接超时 (10秒)';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '网络错误或 CORS 限制';
      } else {
        errorMessage = error.message;
      }
      
      setTestResult({
        status: 'error',
        responseTime,
        errorMessage,
      });
      toast.error(errorMessage);
    }
  };

  const handleSave = () => {
    if (!provider) return;

    if (!name.trim()) {
      toast.error("请输入名称");
      return;
    }

    // 解析模型列表（支持逗号或换行分隔）
    const models = model
      .split(/[,\n]/)
      .map(m => m.trim())
      .filter(m => m.length > 0);

    onSave({
      ...provider,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: models,
    });

    onOpenChange(false);
    toast.success("已保存更改");
  };

  const keyCount = getApiKeyCount(apiKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑供应商</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Platform (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">平台</Label>
            <Input value={provider?.platform || ""} disabled className="bg-muted" />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="供应商名称"
              autoComplete="off"
            />
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Base URL</Label>
              {testResult && (
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  testResult.status === 'success' ? "text-green-500" : "text-red-500"
                )}>
                  {testResult.status === 'success' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{testResult.statusCode} · {testResult.responseTime}ms</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      <span>{testResult.errorMessage}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  setTestStatus('idle');
                  setTestResult(null);
                }}
                placeholder="https://api.example.com/v1"
                autoComplete="off"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing' || !baseUrl.trim()}
                title="检测连接"
              >
                {testStatus === 'testing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              点击检测按钮验证 API 地址是否可访问
            </p>
          </div>

          {/* API Keys */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>API Keys</Label>
              <span className="text-xs text-muted-foreground">
                {keyCount} 个 Key
              </span>
            </div>
            <Textarea
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入 API Keys（每行一个，或用逗号分隔）"
              className="font-mono text-sm min-h-[100px]"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              💡 支持多个 Key 轮换使用，失败时自动切换到下一个
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label>模型</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="输入模型名称，如 deepseek-v3"
            />
            <p className="text-xs text-muted-foreground">
              多个模型用逗号分隔，第一个为默认模型
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
