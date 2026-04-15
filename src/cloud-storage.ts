// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端存储统一导出入口
 * 使用自定义 JWT API 实现云端存储和同步
 */

// 从 lib/cloud-auth 重新导出
export { cloudAuth, CloudAuthManager } from './lib/cloud-auth';
export type { CloudUser, AuthResult } from './lib/cloud-auth';

// 从 lib/cloud-project-manager 重新导出
export { cloudProjectManager, CloudProjectManager } from './lib/cloud-project-manager';
export type { CloudProject, ProjectData } from './lib/cloud-project-manager';

// 从 lib/cloud-storage 重新导出 React Hooks
export { useCloudAuth, useCloudProjects } from './lib/cloud-storage';
