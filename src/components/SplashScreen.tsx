// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * SplashScreen - JuBu AI 启动页
 * 提供快捷操作入口和品牌展示
 */

import { useState } from "react";
import { useThemeStore } from "@/stores/theme-store";
import { useDirectorStore } from "@/stores/director-store";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { AuthPage } from "./auth/AuthPage";
import { 
  Film, 
  Plus, 
  FolderOpen, 
  Sun, 
  Moon, 
  Monitor,
  LogIn,
  UserPlus
} from "lucide-react";

interface SplashScreenProps {
  onEnter: () => void;
}

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const { theme, setTheme } = useThemeStore();
  const { setActiveProjectId } = useDirectorStore();
  const { isAuthenticated } = useAuthStore();
  const [showAuthPage, setShowAuthPage] = useState(false);

  const handleLogin = () => {
    setShowAuthPage(true);
  };

  const handleRegister = () => {
    setShowAuthPage(true);
  };

  const handleCreateProject = () => {
    // 生成新的项目 ID
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setActiveProjectId(projectId);
    onEnter();
  };

  const handleOpenProject = () => {
    // 触发打开项目对话框
    const event = new CustomEvent('openProjectDialog');
    window.dispatchEvent(event);
    onEnter();
  };

  const handleAuthSuccess = () => {
    setShowAuthPage(false);
    onEnter();
  };

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: '浅色' },
    { value: 'dark' as const, icon: Moon, label: '深色' },
    { value: 'system' as const, icon: Monitor, label: '跟随系统' },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-background">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />

      {/* 主内容区 */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
        {/* Logo 和标题 */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="flex items-center justify-center gap-4 mb-6" />
          
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            JuBu AI
          </h1>
          
          <p className="text-xl text-muted-foreground mb-2">
            AI 驱动的动漫/短剧分镜创作工具
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60">
            <Film className="h-4 w-4" />
            <span>版本 V1.0.0</span>
          </div>
        </div>

        {/* 快捷操作按钮 */}
        <div className="flex flex-col gap-4 w-full max-w-md mb-12 animate-fade-in-up-delayed">
          <Button 
            size="lg" 
            className="h-14 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            onClick={handleLogin}
          >
            <LogIn className="mr-2 h-5 w-5" />
            登录
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="h-14 text-lg font-medium"
            onClick={handleRegister}
          >
            <UserPlus className="mr-2 h-5 w-5" />
            注册
          </Button>

          <Button 
            variant="ghost" 
            size="lg" 
            className="h-12 text-base font-normal"
            onClick={handleCreateProject}
          >
            游客体验
          </Button>
        </div>

        {/* 底部功能入口 */}
        <div className="flex gap-8 text-sm text-muted-foreground animate-fade-in-up-delayed-2">
          <button className="hover:text-primary transition-colors flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            S级创作
          </button>
          <button className="hover:text-primary transition-colors flex items-center gap-1">
            <Layers className="h-4 w-4" />
            剧本管理
          </button>
          <button className="hover:text-primary transition-colors flex items-center gap-1">
            <Film className="h-4 w-4" />
            角色库
          </button>
        </div>
      </div>

      {/* 主题切换 - 右下角 */}
      <div className="absolute bottom-8 right-8 z-20 animate-fade-in-up-delayed-3">
        <div className="flex gap-2 bg-card/80 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
          {themeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`p-2 rounded-md transition-all ${
                theme === value 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-muted'
              }`}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      {/* 版权信息 - 左下角 */}
      <div className="absolute bottom-8 left-8 z-20 text-xs text-muted-foreground/60 animate-fade-in">
        <p>© 2025 JuBu AI. All rights reserved.</p>
        <p className="mt-1">Powered by AI</p>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(20px) rotate(-5deg); }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up-delayed {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up-delayed-2 {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up-delayed-3 {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        .animate-gradient-shift {
          animation: gradient-shift 8s ease-in-out infinite;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        
        .animate-fade-in-up-delayed {
          animation: fade-in-up-delayed 0.6s ease-out 0.2s forwards;
          opacity: 0;
        }
        
        .animate-fade-in-up-delayed-2 {
          animation: fade-in-up-delayed-2 0.6s ease-out 0.4s forwards;
          opacity: 0;
        }
        
        .animate-fade-in-up-delayed-3 {
          animation: fade-in-up-delayed-3 0.6s ease-out 0.6s forwards;
          opacity: 0;
        }
        
        .animate-fade-in {
          animation: fade-in-up 0.6s ease-out 0.8s forwards;
          opacity: 0;
        }
        
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
      `}</style>

      {/* 认证页面 */}
      {showAuthPage && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <AuthPage onSuccess={handleAuthSuccess} onCancel={() => setShowAuthPage(false)} />
        </div>
      )}
    </div>
  );
}
