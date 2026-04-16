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
import { HelpGuide } from "./auth/HelpGuide";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { 
  Film, 
  Sun, 
  Moon, 
  Monitor,
  Sparkles,
  Layers,
  LogIn,
  UserPlus,
  PenTool,
  ChevronRight,
  Wand2,
  BookOpen
} from "lucide-react";

interface SplashScreenProps {
  onEnter: () => void;
}

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const { theme, setTheme } = useThemeStore();
  useAuthStore();
  const [showAuthPage, setShowAuthPage] = useState(true); // 默认显示登录页面
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  const handleLogin = () => {
    setShowAuthPage(true);
  };

  const handleRegister = () => {
    setShowAuthPage(true);
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

  const quickFeatures = [
    { icon: Wand2, label: 'AI 创作', desc: '智能生成', color: 'from-violet-500 to-purple-500' },
    { icon: PenTool, label: '剧本管理', desc: '故事创作', color: 'from-blue-500 to-cyan-500' },
    { icon: Layers, label: '分镜制作', desc: '视觉呈现', color: 'from-orange-500 to-amber-500' },
    { icon: Film, label: '角色库', desc: '角色管理', color: 'from-rose-500 to-pink-500' },
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
      {/* 动态背景 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 主渐变光晕 */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent rounded-full blur-[150px] animate-glow-pulse" />
        
        {/* 装饰性几何图形 */}
        <div className="absolute top-20 left-20 w-32 h-32 border border-primary/10 rounded-2xl rotate-12 animate-float" />
        <div className="absolute bottom-32 right-20 w-24 h-24 border border-secondary/10 rounded-full animate-float-delayed" />
        <div className="absolute top-40 right-32 w-16 h-16 bg-gradient-to-br from-primary/5 to-transparent rounded-xl rotate-45 animate-float-delayed-2" />
        
        {/* 细网格背景 */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} />
        
        {/* 径向渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* 主内容 */}
      <div className="relative z-10 h-full flex flex-col">
        
        {/* 顶部导航 */}
        <header className="flex items-center justify-between px-8 py-6 animate-slide-down">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                <Film className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur-md -z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">JuBu AI</h1>
              <p className="text-xs text-muted-foreground/80">智能分镜创作平台</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground/60 font-mono">v1.0.0</span>
            <div className="w-px h-4 bg-border/50" />
            <div className="flex items-center gap-1 bg-muted/50 backdrop-blur-sm border rounded-lg p-1">
              {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    theme === value 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* 中心内容区 */}
        <main className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-2xl">
            {/* 品牌区域 */}
            <div className="text-center mb-16 animate-fade-up">
              {/* 大 Logo 展示 */}
              <div className="relative inline-block mb-8">
                <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-secondary flex items-center justify-center shadow-2xl shadow-primary/30 animate-logo-glow">
                  <Film className="w-16 h-16 text-primary-foreground" />
                </div>
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 rounded-3xl blur-2xl -z-10 animate-logo-glow-delayed" />
              </div>
              
              <h2 className="text-5xl font-bold mb-4 tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
                  AI 驱动的分镜创作
                </span>
              </h2>
              <p className="text-xl text-muted-foreground/80">
                动漫 · 短剧 · 视觉叙事的全新体验
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-4 mb-16 animate-fade-up-delayed">
              <Button 
                size="lg" 
                className="w-full h-14 text-lg font-semibold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group"
                onClick={handleLogin}
              >
                <span>登录账号</span>
                <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full h-14 text-lg font-medium border-2 bg-background/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
                onClick={handleRegister}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                创建账号
              </Button>
            </div>

            {/* 功能入口 */}
            <div className="grid grid-cols-4 gap-4 animate-fade-up-delayed-2">
              {quickFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="group relative"
                  onMouseEnter={() => setIsHovered(feature.label)}
                  onMouseLeave={() => setIsHovered(null)}
                >
                  <div className={`relative p-5 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 hover:border-border transition-all duration-300 ${
                    isHovered === feature.label ? 'shadow-lg shadow-black/10 scale-105' : ''
                  }`}>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 shadow-lg`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1">{feature.label}</h3>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    
                    {/* 悬停效果 */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 rounded-2xl transition-opacity duration-300 ${
                      isHovered === feature.label ? 'opacity-5' : ''
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* 底部 */}
        <footer className="px-8 py-6 animate-fade-up-delayed-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="text-sm text-muted-foreground/60">
              <p>© 2025 JuBu AI · 让创作更简单</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelpGuide(true)}
                className="text-muted-foreground/60 hover:text-foreground text-xs gap-1.5"
              >
                <BookOpen className="h-3.5 w-3.5" />
                使用指南
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
                <Sparkles className="w-4 h-4 text-primary/60" />
                <span>Powered by AI</span>
              </div>
            </div>
          </div>
        </footer>

        {/* 帮助指南 */}
        <Dialog open={showHelpGuide} onOpenChange={setShowHelpGuide}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
            <HelpGuide className="rounded-xl" />
          </DialogContent>
        </Dialog>
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-up-delayed {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-up-delayed-2 {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-up-delayed-3 {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes glow-pulse {
          0%, 100% { 
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% { 
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(12deg); }
          50% { transform: translateY(-10px) rotate(12deg); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes float-delayed-2 {
          0%, 100% { transform: rotate(45deg) translateY(0); }
          50% { transform: rotate(45deg) translateY(-8px); }
        }
        
        @keyframes logo-glow {
          0%, 100% { box-shadow: 0 0 40px 10px rgba(var(--primary), 0.3); }
          50% { box-shadow: 0 0 60px 20px rgba(var(--primary), 0.4); }
        }
        
        @keyframes logo-glow-delayed {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        .animate-slide-down {
          animation: slide-down 0.6s ease-out forwards;
        }
        
        .animate-fade-up {
          animation: fade-up 0.8s ease-out 0.1s forwards;
          opacity: 0;
        }
        
        .animate-fade-up-delayed {
          animation: fade-up-delayed 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }
        
        .animate-fade-up-delayed-2 {
          animation: fade-up-delayed-2 0.8s ease-out 0.4s forwards;
          opacity: 0;
        }
        
        .animate-fade-up-delayed-3 {
          animation: fade-up-delayed-3 0.8s ease-out 0.6s forwards;
          opacity: 0;
        }
        
        .animate-glow-pulse {
          animation: glow-pulse 6s ease-in-out infinite;
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 6s ease-in-out infinite;
          animation-delay: 1s;
        }
        
        .animate-float-delayed-2 {
          animation: float-delayed-2 7s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        .animate-logo-glow {
          animation: logo-glow 3s ease-in-out infinite;
        }
        
        .animate-logo-glow-delayed {
          animation: logo-glow-delayed 3s ease-in-out infinite;
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  );
}
