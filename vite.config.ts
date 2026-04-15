import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'

// 确定当前模式（development, production, test）
const mode = process.env.NODE_ENV || 'development';
// 加载所有 .env 文件
const env = loadEnv(mode, process.cwd(), '');
console.log('[Vite] Loading env - Mode:', mode);

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@opencut/ai-core/services/prompt-compiler': path.resolve(__dirname, './src/packages/ai-core/services/prompt-compiler.ts'),
      '@opencut/ai-core/api/task-poller': path.resolve(__dirname, './src/packages/ai-core/api/task-poller.ts'),
      '@opencut/ai-core/protocol': path.resolve(__dirname, './src/packages/ai-core/protocol/index.ts'),
      '@opencut/ai-core': path.resolve(__dirname, './src/packages/ai-core/index.ts'),
    },
  },
  build: {
    // 启用更好的代码分割
    rollupOptions: {
      output: {
        // 手动分包策略
        manualChunks: (id) => {
          // React 生态
          if (id.includes('node_modules/react')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-dom')) {
            return 'vendor-react-dom';
          }
          // Radix UI 组件库
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          // Recharts 图表库
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          // PDF.js
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdf';
          }
          // Motion 动画库
          if (id.includes('node_modules/motion')) {
            return 'vendor-motion';
          }
          // i18n
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n';
          }
          // Zustand 状态管理
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          // 其他 vendor
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        },
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 禁用 SourceMap
    sourcemap: false,
    // 开启 minify
    minify: 'terser',
    // 分包大小警告阈值
    chunkSizeWarningLimit: 500,
    // 压缩
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
    ],
  },
  // 警告限制
  chunkSizeWarningLimit: 600,
  plugins: [
    react(),
  ],
  server: {
    port: 5000,
    host: true,
    proxy: mode === 'development' ? {
      // 开发环境：代理到 API 服务器
      '/api/sync': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    } : {},
  },
})
