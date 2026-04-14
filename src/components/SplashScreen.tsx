// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * SplashScreen - JuBu AI 启动页
 * 提供快捷操作入口和品牌展示
 */

import { useState } from "react";
import { useThemeStore } from "@/stores/theme-store";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { AuthPage } from "./auth/AuthPage";
import { 
  Film, 
  Sun, 
  Moon, 
  Monitor,
  Sparkles,
  Layers,
  LogIn,
  UserPlus,
  FolderOpen,
  PenTool
} from "lucide-react";

interface SplashScreenProps {
  onEnter: () => void;
}

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const { theme, setTheme } = useThemeStore();
  useAuthStore(); // 确保初始化 Auth Store
  const [showAuthPage, setShowAuthPage] = useState(false);

  const handleLogin = () => {
    setShowAuthPage(true);
  };

  const handleRegister = () => {
    setShowAuthPage(true);
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

  // 快捷功能入口
  const quickFeatures = [
    { icon: Sparkles, label: 'S级创作', desc: 'AI 智能生成' },
    { icon: PenTool, label: '剧本管理', desc: '故事创作' },
    { icon: Layers, label: '分镜制作', desc: '视觉呈现' },
    { icon: Film, label: '角色库', desc: '角色管理' },
  ];

  if (showAuthPage) {
    return (
      <AuthPage 
        onSuccess={handleAuthSuccess} 
        onBack={() => setShowAuthPage(false)} 
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-background">
      {/* 背景装饰 - 渐变光晕 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] animate-pulse-slow-delayed" />
        {/* 网格背景 */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* 主内容区 */}
      <div className="relative z-10 h-full flex flex-col">
        
        {/* 顶部区域 - Logo */}
        <header className="flex items-center justify-between px-8 py-6">
          {/* 品牌标识 */}
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">JuBu AI</h1>
              <p className="text-xs text-muted-foreground">智能创作平台</p>
            </div>
          </div>
          
          {/* 版本号 */}
          <div className="text-sm text-muted-foreground/60 animate-fade-in">
            v1.0.0
          </div>
        </header>

        {/* 中间区域 - 主要操作 */}
        <main className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-lg">
            {/* 标题区 */}
            <div className="text-center mb-12 animate-fade-in-up">
              <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                AI 驱动的分镜创作
              </h2>
              <p className="text-lg text-muted-foreground">
                动漫 · 短剧 · 视觉叙事
              </p>
            </div>

            {/* 主操作按钮组 */}
            <div className="space-y-3 animate-fade-in-up-delayed">
              <Button 
                size="lg" 
                className="w-full h-14 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                onClick={handleLogin}
              >
                <LogIn className="mr-2 h-5 w-5" />
                登录账号
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full h-14 text-lg font-medium border-2 hover:bg-primary/5"
                onClick={handleRegister}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                创建账号
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-background text-sm text-muted-foreground">
                    或
                  </span>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="lg" 
                className="w-full h-12 text-base font-normal text-muted-foreground hover:text-foreground"
                onClick={handleOpenProject}
              >
                <FolderOpen className="mr-2 h-5 w-5" />
                打开已有项目
              </Button>
            </div>
          </div>
        </main>

        {/* 底部区域 - 功能入口 + 主题切换 */}
        <footer className="px-8 py-6">
          {/* 功能入口 */}
          <div className="grid grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto animate-fade-in-up-delayed-2">
            {quickFeatures.map((feature) => (
              <button
                key={feature.label}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 hover:bg-card border border-transparent hover:border-border/50 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{feature.label}</span>
                <span className="text-xs text-muted-foreground">{feature.desc}</span>
              </button>
            ))}
          </div>

          {/* 底部栏 */}
          <div className="flex items-center justify-between">
            {/* 版权信息 */}
            <div className="text-xs text-muted-foreground/60">
              <p>© 2025 JuBu AI</p>
            </div>

            {/* 主题切换 */}
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border rounded-lg p-1.5 shadow-sm">
              {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`p-2 rounded-md transition-all ${
                    theme === value 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up-delayed {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up-delayed-2 {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes pulse-slow-delayed {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out 0.1s forwards;
          opacity: 0;
        }
        
        .animate-fade-in-up-delayed {
          animation: fade-in-up-delayed 0.6s ease-out 0.2s forwards;
          opacity: 0;
        }
        
        .animate-fade-in-up-delayed-2 {
          animation: fade-in-up-delayed-2 0.6s ease-out 0.4s forwards;
          opacity: 0;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-pulse-slow-delayed {
          animation: pulse-slow-delayed 5s ease-in-out infinite;
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
