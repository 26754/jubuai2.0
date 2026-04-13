// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端存储模块导出
 */

export { cloudAuth, type CloudUser, type AuthResult } from '@/lib/cloud-auth';
export { cloudProjectManager, type CloudProject, type ProjectData } from '@/lib/cloud-project-manager';
export { 
  useCloudAuth, 
  useCloudProjects, 
  type UseCloudAuthReturn, 
  type UseCloudProjectsReturn 
} from '@/hooks/use-cloud-sync';
