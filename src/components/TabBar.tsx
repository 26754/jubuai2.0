// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
import { mainNavItems, bottomNavItems, useMediaPanelStore } from "@/stores/media-panel-store";
import { useThemeStore } from "@/stores/theme-store";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, LayoutDashboard, Sun, Moon, LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TabBar() {
  const { activeTab, inProject, setActiveTab, setInProject } = useMediaPanelStore();
  const { theme, toggleTheme } = useThemeStore();
  const { isAuthenticated, login, logout, isLoading } = useAuthStore();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  // Handle login
  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("请填写邮箱和密码");
      return;
    }
    
    const success = isRegister 
      ? await login(email, password)
      : await login(email, password);
    
    if (success) {
      toast.success(isRegister ? "注册成功" : "登录成功");
      setLoginDialogOpen(false);
      setEmail("");
      setPassword("");
    } else {
      toast.error(isRegister ? "注册失败" : "登录失败，请检查邮箱和密码");
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    toast.success("已退出登录");
  };

  // Dashboard mode
  if (!inProject) {
    return (
      <div className="flex flex-col w-14 bg-panel border-r border-border py-2">
        <div className="p-2">
          <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center mx-auto rounded">
            <span className="text-sm font-bold">M</span>
          </div>
        </div>
        {/* Dashboard nav */}
        <nav className="flex-1 py-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={cn(
                    "w-full flex flex-col items-center py-2.5 transition-colors",
                    activeTab === "dashboard"
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <LayoutDashboard className="h-5 w-5 mb-0.5" />
                  <span className="text-[9px]">项目</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">项目仪表盘</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>
        {/* Bottom: User Info + Settings + Theme */}
        <div className="mt-auto border-t border-border py-1">
          {/* User Login/Logout - Below Theme Toggle */}
          {isAuthenticated ? (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="w-full flex flex-col items-center py-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-[8px]">退出</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">退出登录</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
              <DialogTrigger asChild>
                <button className="w-full flex flex-col items-center py-2 text-muted-foreground hover:text-primary transition-colors">
                  <LogIn className="h-4 w-4" />
                  <span className="text-[8px]">登录</span>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isRegister ? "注册账号" : "登录账号"}</DialogTitle>
                  <DialogDescription>
                    {isRegister ? "创建一个新账号来使用云端同步功能" : "登录以使用云端同步功能"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter className="flex flex-col gap-2">
                  <Button onClick={handleLogin} disabled={isLoading}>
                    {isLoading ? "处理中..." : (isRegister ? "注册" : "登录")}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-xs"
                  >
                    {isRegister ? "已有账号？登录" : "没有账号？注册"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {/* Theme Toggle */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleTheme}
                  className="w-full flex flex-col items-center py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span className="text-[8px]">{theme === "dark" ? "浅色" : "深色"}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  // Project mode - flat navigation
  return (
    <div className="flex flex-col w-14 bg-panel border-r border-border">
      {/* Logo + Back */}
      <div className="p-2 border-b border-border">
        <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center mx-auto rounded mb-1">
          <span className="text-sm font-bold">M</span>
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setInProject(false)}
                className="flex items-center justify-center w-full h-5 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">返回项目列表</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-1">
        {mainNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <TooltipProvider key={item.id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex flex-col items-center py-2.5 transition-colors",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="h-5 w-5 mb-0.5" />
                    <span className="text-[9px]">{item.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}{item.phase ? ` (Phase ${item.phase})` : ""}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>

      {/* Bottom: User Info + Settings + Theme */}
      <div className="mt-auto border-t border-border py-1">
        {/* User Login/Logout - Below Theme Toggle */}
        {isAuthenticated ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full flex flex-col items-center py-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-[8px]">退出</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">退出登录</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex flex-col items-center py-2 text-muted-foreground hover:text-primary transition-colors">
                <LogIn className="h-4 w-4" />
                <span className="text-[8px]">登录</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isRegister ? "注册账号" : "登录账号"}</DialogTitle>
                <DialogDescription>
                  {isRegister ? "创建一个新账号来使用云端同步功能" : "登录以使用云端同步功能"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email-project">邮箱</Label>
                  <Input
                    id="email-project"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-project">密码</Label>
                  <Input
                    id="password-project"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-2">
                <Button onClick={handleLogin} disabled={isLoading}>
                  {isLoading ? "处理中..." : (isRegister ? "注册" : "登录")}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-xs"
                >
                  {isRegister ? "已有账号？登录" : "没有账号？注册"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {bottomNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <TooltipProvider key={item.id} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex flex-col items-center py-2 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[8px]">{item.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        {/* Theme Toggle */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="w-full flex flex-col items-center py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="text-[8px]">{theme === "dark" ? "浅色" : "深色"}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
