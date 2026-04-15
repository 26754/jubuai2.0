// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/i18n'

// 全局错误处理：捕获未处理的 Promise 错误
window.addEventListener('unhandledrejection', (event) => {
  // 忽略 Supabase 相关的网络错误（跨域、超时等）
  const error = event.reason;
  if (error && typeof error === 'object') {
    const message = error.message || '';
    const name = error.name || '';
    // 忽略常见的网络/跨域错误
    if (
      name === 'TypeError' && 
      (message.includes('fetch') || 
       message.includes('CORS') || 
       message.includes('NetworkError') ||
       message.includes('Failed to fetch') ||
       message.includes('net::') ||
       message.includes('Network request failed'))
    ) {
      event.preventDefault();
      return;
    }
  }
  // 其他错误正常抛出
  console.warn('[Unhandled Promise Rejection]', error);
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('SW registered:', registration.scope);
      },
      (error) => {
        console.log('SW registration failed:', error);
      }
    );
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Use contextBridge (only available in Electron)
if (window.ipcRenderer) {
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
}
