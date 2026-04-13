/**
 * 统一 API 测试对话框
 * 合并多个平台的 API 测试功能
 */
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAPIConfigStore } from "@/stores/api-config-store";
import { proxyUrl } from "@/lib/proxy-config";
import type { ProviderId } from "@opencut/ai-core";

interface UnifiedApiTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 默认选中的提供商 ID */
  defaultProviderId?: string;
  /** 默认选中的提供商平台 */
  defaultPlatform?: string;
}

export function UnifiedApiTestDialog({
  open,
  onOpenChange,
  defaultProviderId,
  defaultPlatform,
}: UnifiedApiTestDialogProps) {
  const { providers, syncProviderModels } = useAPIConfigStore();
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    defaultProviderId || providers[0]?.id || ""
  );
  const [customUrl, setCustomUrl] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [testEndpoint, setTestEndpoint] = useState("/v1/models");
  const [testResult, setTestResult] = useState<{
    status: "idle" | "success" | "error";
    message: string;
    data?: unknown;
  }>({ status: "idle", message: "" });
  const [loading, setLoading] = useState(false);

  // Get selected provider
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  // Determine URL and Key to use
  const urlToTest = customUrl || selectedProvider?.baseUrl || "";
  const keyToTest = customKey || selectedProvider?.apiKey || "";

  const handleTest = async () => {
    if (!urlToTest.trim()) {
      setTestResult({ status: "error", message: "请输入或选择 API URL" });
      return;
    }
    if (!keyToTest.trim()) {
      setTestResult({ status: "error", message: "请输入或选择 API Key" });
      return;
    }

    setLoading(true);
    setTestResult({ status: "idle", message: "测试中..." });

    try {
      // 构建完整 URL
      let fullUrl = urlToTest.trim();
      if (!fullUrl.startsWith("http")) {
        fullUrl = `https://${fullUrl}`;
      }
      if (!fullUrl.endsWith("/v1/models") && testEndpoint) {
        fullUrl = `${fullUrl.replace(/\/$/, "")}${testEndpoint}`;
      }

      // 应用代理
      const proxiedUrl = proxyUrl(fullUrl);

      console.log(`[API测试] 原始URL: ${fullUrl}`);
      console.log(`[API测试] 代理URL: ${proxiedUrl}`);

      const response = await fetch(proxiedUrl, {
        headers: {
          Authorization: `Bearer ${keyToTest.trim()}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const modelCount = Array.isArray(data.data)
          ? data.data.length
          : Array.isArray(data)
          ? data.length
          : 0;
        setTestResult({
          status: "success",
          message: `成功！获取到 ${modelCount} 个模型`,
          data,
        });
      } else {
        const errorText = await response.text();
        setTestResult({
          status: "error",
          message: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        });
      }
    } catch (error: any) {
      let errorType = "网络请求失败";
      let suggestion = "";

      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        errorType = "CORS 跨域错误";
        suggestion = "\n可能原因：代理未配置或后端服务未启动";
      } else if (error.message.includes("timeout")) {
        errorType = "请求超时";
        suggestion = "\n可能原因：网络连接问题或服务器响应过慢";
      } else if (error.message.includes("ECONNREFUSED")) {
        errorType = "连接被拒绝";
        suggestion = "\n可能原因：代理服务未启动";
      }

      setTestResult({
        status: "error",
        message: `${errorType}: ${error.message}${suggestion}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncModels = async () => {
    if (!selectedProviderId) return;

    setLoading(true);
    try {
      const result = await syncProviderModels(selectedProviderId);
      if (result.success) {
        setTestResult({
          status: "success",
          message: `同步成功！共 ${result.count} 个模型`,
        });
      } else {
        setTestResult({
          status: "error",
          message: `同步失败: ${result.error}`,
        });
      }
    } catch (error: any) {
      setTestResult({
        status: "error",
        message: `同步失败: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API 连接测试</DialogTitle>
          <DialogDescription>
            测试 API 连接是否正常，支持自定义 URL 和 Key
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>选择已配置的供应商</Label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
            >
              <option value="">-- 选择供应商 --</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.platform})
                </option>
              ))}
            </select>
            {selectedProvider && (
              <p className="text-xs text-muted-foreground">
                Base URL: {selectedProvider.baseUrl}
              </p>
            )}
          </div>

          {/* Custom URL */}
          <div className="space-y-2">
            <Label>或自定义 API URL</Label>
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              autoComplete="off"
            />
          </div>

          {/* Custom Key */}
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="sk-xxxx"
              autoComplete="off"
              className="font-mono"
            />
          </div>

          {/* Test Endpoint */}
          <div className="space-y-2">
            <Label>测试端点</Label>
            <Input
              value={testEndpoint}
              onChange={(e) => setTestEndpoint(e.target.value)}
              placeholder="/v1/models"
              autoComplete="off"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleTest} disabled={loading} className="flex-1">
              {loading ? "测试中..." : "测试连接"}
            </Button>
            {selectedProviderId && (
              <Button
                onClick={handleSyncModels}
                disabled={loading}
                variant="outline"
              >
                同步模型
              </Button>
            )}
          </div>

          {/* Test Result */}
          {testResult.status !== "idle" && (
            <Alert variant={testResult.status === "success" ? "default" : "destructive"}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">{testResult.message}</div>
                  {testResult.data && (
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-60">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
