// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
"use client";

/**
 * 用户菜单组件
 * 包含登录/注册按钮和用户信息下拉菜单
 */

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";
import { LoginDialog } from "./LoginDialog";
import { RegisterDialog } from "./RegisterDialog";
import { LogOut, Settings, User as UserIcon, ChevronDown } from "lucide-react";

export function AuthButton() {
  const { user, isAuthenticated, logout } = useAuthStore();
  
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 切换到登录
  const handleSwitchToLogin = () => {
    setShowRegister(false);
    setShowLogin(true);
  };

  // 切换到注册
  const handleSwitchToRegister = () => {
    setShowLogin(false);
    setShowRegister(true);
  };

  // 登出
  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  // 获取用户首字母
  const getInitials = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowLogin(true)}
          >
            登录
          </Button>
          <Button 
            size="sm"
            onClick={() => setShowRegister(true)}
          >
            注册
          </Button>
        </div>
        
        <LoginDialog 
          open={showLogin} 
          onOpenChange={setShowLogin}
          onSwitchToRegister={handleSwitchToRegister}
        />
        
        <RegisterDialog 
          open={showRegister} 
          onOpenChange={setShowRegister}
          onSwitchToLogin={handleSwitchToLogin}
        />
      </>
    );
  }

  // 已登录状态
  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {user?.username ? getInitials(user.username) : "U"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-medium">
            {user?.username || user?.email}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            showDropdown && "rotate-180"
          )} />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border overflow-hidden z-50">
            {/* User Info */}
            <div className="p-3 border-b bg-muted/30">
              <p className="font-medium truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            
            {/* Menu Items */}
            <div className="p-1">
              <button
                onClick={() => {
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
              >
                <UserIcon className="h-4 w-4" />
                个人资料
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4" />
                设置
              </button>
            </div>
            
            {/* Divider */}
            <div className="border-t" />
            
            {/* Logout */}
            <div className="p-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
