// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * 云端存储统一导出入口
 */

export { supabase, createSupabaseClient, getCurrentSession, getCurrentUser } from './database/supabase-client';
export { cloudAuth, CloudAuthManager } from './lib/cloud-auth';
export type { CloudUser, AuthResult } from './lib/cloud-auth';
export { cloudProjectManager, CloudProjectManager } from './lib/cloud-project-manager';
export type { CloudProject, ProjectData } from './lib/cloud-project-manager';
export { useCloudAuth, useCloudProjects } from './lib/cloud-storage';
