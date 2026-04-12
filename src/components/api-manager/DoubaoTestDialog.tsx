// Copyright (c) 2025 JuBu AI
"use client";

/**
 * 豆包 API 测试对话框
 */

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
import { testDoubaoAPI, DOUBAN_MODELS } from "@/lib/ai/doubao-tester";
import { toast } from "sonner";

interface DoubaoTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DoubaoTestDialog({
  open,
  onOpenChange,
}: DoubaoTestDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("doubao-pro-32k");
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    content?: string;
    latency?: number;
  } | null>(null);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast.error("请输入 API Key");
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const result = await testDoubaoAPI(apiKey.trim(), selectedModel);
      setTestResult({
        success: result.success,
        message: result.message,
        content: result.response?.content,
        latency: result.latency,
      });

      if (result.success) {
        toast.success("豆包 API 测试成功！");
      } else {
        toast.error(`测试失败: ${result.message}`);
      }
    } catch (error: any) {
      const errorMessage = error.message || "未知错误";
      setTestResult({
        success: false,
        message: errorMessage,
      });
      toast.error(`测试失败: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setApiKey("");
    setTestResult(null);
    setSelectedModel("doubao-pro-32k");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg
              className="w-6 h-6"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="doubao-grad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#FF6B6B" />
                  <stop offset="50%" stopColor="#FF8E53" />
                  <stop offset="100%" stopColor="#FFA726" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="20" fill="url(#doubao-grad)" />
              <ellipse cx="18" cy="20" rx="3" ry="4" fill="white" />
              <ellipse cx="30" cy="20" rx="3" ry="4" fill="white" />
              <ellipse cx="18" cy="21" rx="1.5" ry="2" fill="#333" />
              <ellipse cx="30" cy="21" rx="1.5" ry="2" fill="#333" />
              <path
                d="M20 30 Q24 35 28 30"
                stroke="#333"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            火山引擎豆包 API 测试
          </DialogTitle>
          <DialogDescription>
            输入您的火山引擎 API Key 进行测试。API Key 可以从{" "}
            <a
              href="https://console.volcengine.com/ark"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              火山引擎控制台
            </a>{" "}
            获取。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* API Key 输入 */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="输入您的火山引擎 API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* 模型选择 */}
          <div className="space-y-2">
            <Label htmlFor="model">选择模型</Label>
            <select
              id="model"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isLoading}
            >
              {DOUBAN_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
          </div>

          {/* 测试按钮 */}
          <Button
            onClick={handleTest}
            disabled={isLoading || !apiKey.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                测试中...
              </>
            ) : (
              "测试连接"
            )}
          </Button>

          {/* 测试结果 */}
          {testResult && (
            <div
              className={`rounded-lg p-4 ${
                testResult.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {testResult.success ? (
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                <span
                  className={`font-medium ${
                    testResult.success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {testResult.message}
                </span>
                {testResult.latency && (
                  <span className="text-sm text-muted-foreground">
                    ({testResult.latency}ms)
                  </span>
                )}
              </div>
              {testResult.content && (
                <div className="mt-2 p-3 bg-white rounded border border-green-100">
                  <p className="text-sm text-gray-700">
                    <strong>AI 回复：</strong>
                    {testResult.content}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 帮助信息 */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">使用说明：</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>登录火山引擎控制台</li>
              <li>进入 ARK API 开放平台</li>
              <li>创建 API Key 并复制</li>
              <li>粘贴到上方输入框并点击测试</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
