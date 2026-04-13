import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAPIConfigStore } from '@/stores/api-config-store';
import { proxyUrl } from '@/lib/proxy-config';

interface DiagnosticResult {
  platform: string;
  status: 'pending' | 'testing' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function APIDiagnosisPage() {
  const { providers } = useAPIConfigStore();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [testing, setTesting] = useState(false);

  const testProvider = async (provider: any): Promise<DiagnosticResult> => {
    const baseUrl = provider.baseUrl?.replace(/\/+$/, '');
    const apiKey = provider.apiKey;

    if (!baseUrl) {
      return {
        platform: provider.name || provider.platform,
        status: 'error',
        message: 'Base URL 未配置',
      };
    }

    if (!apiKey) {
      return {
        platform: provider.name || provider.platform,
        status: 'error',
        message: 'API Key 未填写',
      };
    }

    // 构建 models API URL
    let modelsUrl = `${baseUrl}/v1/models`;
    if (/\/v\d+$/.test(baseUrl)) {
      modelsUrl = `${baseUrl}/models`;
    }

    // 使用集中化的代理配置
    const proxiedUrl = proxyUrl(modelsUrl);

    try {
      console.log(`[诊断] 测试 ${provider.name}: ${proxiedUrl}`);

      const response = await fetch(proxiedUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const modelCount = Array.isArray(data.data) ? data.data.length :
                          Array.isArray(data) ? data.length : 0;
        return {
          platform: provider.name || provider.platform,
          status: 'success',
          message: `成功！获取到 ${modelCount} 个模型`,
          details: `URL: ${proxiedUrl}\n状态码: ${response.status}`,
        };
      } else {
        const errorText = await response.text();
        return {
          platform: provider.name || provider.platform,
          status: 'error',
          message: `HTTP ${response.status}`,
          details: `URL: ${proxiedUrl}\n响应: ${errorText.substring(0, 200)}`,
        };
      }
    } catch (error: any) {
      let errorType = '网络请求失败';
      let suggestion = '';

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorType = 'CORS 跨域错误';
        suggestion = '\n可能原因：代理未配置或后端服务未启动';
      } else if (error.message.includes('timeout')) {
        errorType = '请求超时';
        suggestion = '\n可能原因：网络连接问题或服务器响应过慢';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorType = '连接被拒绝';
        suggestion = '\n可能原因：代理服务未启动';
      }

      return {
        platform: provider.name || provider.platform,
        status: 'error',
        message: errorType,
        details: `URL: ${proxyPath}\n错误: ${error.message}${suggestion}`,
      };
    }
  };

  const runDiagnosis = async () => {
    setTesting(true);
    setResults([]);

    const providersWithKeys = providers.filter(p => p.apiKey && p.apiKey.trim());

    if (providersWithKeys.length === 0) {
      setResults([{
        platform: '系统',
        status: 'error',
        message: '没有找到已配置 API Key 的供应商',
        details: '请先在 API 管理页面配置 API Key',
      }]);
      setTesting(false);
      return;
    }

    const diagnosisResults: DiagnosticResult[] = [];

    for (const provider of providersWithKeys) {
      setResults(prev => [...prev, {
        platform: provider.name || provider.platform,
        status: 'testing',
        message: '正在测试...',
      }]);

      const result = await testProvider(provider);

      setResults(prev => prev.map((r, i) =>
        i === prev.length - 1 ? result : r
      ));

      diagnosisResults.push(result);
    }

    setTesting(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">API 诊断工具</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>模型同步诊断</CardTitle>
          <CardDescription>
            测试各平台的 /v1/models 接口是否可达
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runDiagnosis}
            disabled={testing}
            size="lg"
          >
            {testing ? '诊断中...' : '开始诊断'}
          </Button>

          {results.map((result, index) => (
            <Alert
              key={index}
              variant={result.status === 'success' ? 'default' : 'destructive'}
            >
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-semibold">
                    {result.platform}: {result.message}
                  </div>
                  {result.details && (
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                      {result.details}
                    </pre>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>常见问题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. 网络请求失败 / CORS 错误</h3>
            <p className="text-sm text-muted-foreground">
              确保 Vite 开发服务器的代理配置正确，或后端 API Server 已启动。
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. API Key 无效</h3>
            <p className="text-sm text-muted-foreground">
              检查 API Key 是否正确填写，是否有空格或特殊字符。
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Base URL 配置错误</h3>
            <p className="text-sm text-muted-foreground">
              确保使用正确的区域端点，例如：
              <br />- 火山引擎北京: https://ark.cn-beijing.volces.com/api/v3
              <br />- 阿里云百炼: https://dashscope.aliyuncs.com/api/v1
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. 权限/配额问题</h3>
            <p className="text-sm text-muted-foreground">
              某些 API 的 /models 接口可能需要特殊权限，或当月配额已用完。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
