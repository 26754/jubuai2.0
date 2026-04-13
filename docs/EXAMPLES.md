# 云端存储使用示例

## 基本使用

### 1. 认证功能

```tsx
// components/CloudAuthButton.tsx
import { useCloudAuth } from '@/hooks/use-cloud-sync';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function CloudAuthButton() {
  const { user, isAuthenticated, login, logout, isLoading } = useCloudAuth();

  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin" />;
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-4">
        <span>{user?.email}</span>
        <Button onClick={logout}>登出</Button>
      </div>
    );
  }

  return <Button onClick={() => login('user@example.com', 'password')}>登录</Button>;
}
```

### 2. 项目列表

```tsx
// components/CloudProjectList.tsx
import { useCloudAuth, useCloudProjects } from '@/hooks/use-cloud-sync';
import { Button } from '@/components/ui/button';

export function CloudProjectList() {
  const { user, isAuthenticated } = useCloudAuth();
  const { 
    projects, 
    isLoading, 
    createProject, 
    deleteProject, 
    refreshProjects 
  } = useCloudProjects(user?.id || null);

  if (!isAuthenticated) {
    return <p>请先登录</p>;
  }

  return (
    <div>
      <Button onClick={() => createProject('新项目')}>
        创建项目
      </Button>

      <Button onClick={refreshProjects}>
        刷新
      </Button>

      {isLoading ? (
        <p>加载中...</p>
      ) : (
        <ul>
          {projects.map(project => (
            <li key={project.id}>
              {project.name}
              <Button onClick={() => deleteProject(project.id)}>
                删除
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 3. 保存项目数据

```tsx
// hooks/useSaveProject.ts
import { useCallback } from 'react';
import { cloudProjectManager } from '@/lib/cloud-project-manager';

export function useSaveProject(projectId: string | null) {
  const saveData = useCallback(async (dataType: string, data: any) => {
    if (!projectId) {
      console.error('没有项目 ID');
      return;
    }

    try {
      await cloudProjectManager.saveProjectData(projectId, dataType, data);
      console.log('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
    }
  }, [projectId]);

  return { saveData };
}
```

### 4. 加载项目数据

```tsx
// hooks/useLoadProject.ts
import { useState, useEffect } from 'react';
import { cloudProjectManager, type ProjectData } from '@/lib/cloud-project-manager';

export function useLoadProject(projectId: string | null) {
  const [data, setData] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setData([]);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const projectData = await cloudProjectManager.loadProjectData(projectId);
        setData(projectData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  return { data, isLoading, error };
}
```

## 高级用法

### 混合存储策略

```tsx
// hooks/useHybridProject.ts
import { useState, useEffect, useCallback } from 'react';
import { cloudProjectManager, type CloudProject } from '@/lib/cloud-project-manager';

const LOCAL_STORAGE_KEY = 'jubuai_projects';

export function useHybridProject(userId: string | null) {
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // 从本地存储加载
  const loadFromLocal = useCallback((): CloudProject[] => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }, []);

  // 保存到本地存储
  const saveToLocal = useCallback((projects: CloudProject[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  }, []);

  // 从云端同步
  const syncFromCloud = useCallback(async () => {
    if (!userId) return;

    setSyncStatus('syncing');
    try {
      const cloudProjects = await cloudProjectManager.getProjects(userId);
      setProjects(cloudProjects);
      saveToLocal(cloudProjects);
      setSyncStatus('idle');
    } catch (error) {
      console.error('云端同步失败:', error);
      setSyncStatus('error');
      // 降级到本地数据
      setProjects(loadFromLocal());
    }
  }, [userId, loadFromLocal, saveToLocal]);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      if (userId) {
        // 已登录：优先云端，降级本地
        await syncFromCloud();
      } else {
        // 未登录：使用本地数据
        setProjects(loadFromLocal());
      }

      setIsLoading(false);
    };

    loadData();
  }, [userId, syncFromCloud, loadFromLocal]);

  // 创建项目
  const createProject = useCallback(async (name: string) => {
    if (!userId) {
      // 未登录：仅保存到本地
      const newProject: CloudProject = {
        id: crypto.randomUUID(),
        userId: '',
        name,
        metadata: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const newProjects = [newProject, ...projects];
      setProjects(newProjects);
      saveToLocal(newProjects);
      return newProject;
    }

    // 已登录：保存到云端
    const newProject = await cloudProjectManager.createProject(userId, name);
    setProjects(prev => [newProject, ...prev]);
    saveToLocal([newProject, ...projects]);
    return newProject;
  }, [userId, projects, saveToLocal]);

  return {
    projects,
    isLoading,
    syncStatus,
    createProject,
    refresh: syncFromCloud,
  };
}
```

### 离线支持

```tsx
// hooks/useOfflineSupport.ts
import { useState, useEffect, useCallback } from 'react';

export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncWhenOnline = useCallback(async (syncFn: () => Promise<void>) => {
    if (isOnline) {
      await syncFn();
    } else {
      console.log('离线状态，等待网络恢复...');
    }
  }, [isOnline]);

  return { isOnline, syncWhenOnline };
}
```

## 错误处理

```tsx
// components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div>
          <h1>出错了</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 测试

```tsx
// __tests__/cloud-sync.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { useCloudAuth, useCloudProjects } from '@/hooks/use-cloud-sync';

test('useCloudAuth - 获取当前用户', async () => {
  const { result } = renderHook(() => useCloudAuth());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  // 根据实际认证状态断言
  expect(result.current).toHaveProperty('user');
  expect(result.current).toHaveProperty('login');
  expect(result.current).toHaveProperty('logout');
});

test('useCloudProjects - 获取项目列表', async () => {
  const { result: authResult } = renderHook(() => useCloudAuth());
  
  await waitFor(() => {
    expect(authResult.current.isLoading).toBe(false);
  });

  const userId = authResult.current.user?.id || null;
  const { result: projectResult } = renderHook(() => useCloudProjects(userId));

  await waitFor(() => {
    expect(projectResult.current.isLoading).toBe(false);
  });

  expect(projectResult.current).toHaveProperty('projects');
  expect(projectResult.current).toHaveProperty('createProject');
  expect(projectResult.current).toHaveProperty('deleteProject');
});
```
