// Copyright (c) 2025 hotflow2024
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
// Commercial licensing available. See COMMERCIAL_LICENSE.md.
/**
 * Project Switcher
 * 
 * Coordinates project switching across all stores:
 * 1. Updates activeProjectId in project-store
 * 2. Rehydrates all project-scoped stores from new project's files
 * 
 * Must be used instead of directly calling setActiveProject()
 * to ensure data consistency across stores.
 */

import { useProjectStore } from '@/stores/project-store';
import { useScriptStore } from '@/stores/script-store';
import { useDirectorStore } from '@/stores/director-store';
import { useMediaStore } from '@/stores/media-store';
import { useCharacterLibraryStore } from '@/stores/character-library-store';
import { useSceneStore } from '@/stores/scene-store';
import { useSimpleTimelineStore } from '@/stores/simple-timeline-store';
import { useSClassStore } from '@/stores/sclass-store';

/**
 * Switch to a different project. Saves current project data and loads new project data.
 * 
 * CRITICAL: The execution order matters! We must:
 * 1. Update project-store's activeProjectId (so storage adapters route to new project files)
 * 2. Rehydrate all stores (loads data from new project's per-project files)
 * 3. THEN sync internal activeProjectId (by this time data is already loaded, so persist
 *    writes will save correct data instead of empty defaults)
 * 
 * Previous bug: setting internal activeProjectId BEFORE rehydrate triggered persist writes
 * that overwrote per-project files with empty/default data.
 * 
 * @param newProjectId - The project ID to switch to
 * @returns Promise that resolves when all stores have been rehydrated
 */
export async function switchProject(newProjectId: string): Promise<void> {
  const currentId = useProjectStore.getState().activeProjectId;
  
  // No-op if same project
  if (currentId === newProjectId) {
    console.log(`[ProjectSwitcher] Same project, no-op: ${newProjectId.substring(0, 8)}`);
    return;
  }

  console.log(`[ProjectSwitcher] Switching from ${currentId?.substring(0, 8) ?? 'none'} to ${newProjectId.substring(0, 8)}`);

  // 1. Wait briefly for any pending persist writes to complete
  //    (persist middleware fires setItem synchronously on state change,
  //     but the actual IPC write is async)
  await new Promise((r) => setTimeout(r, 50));

  // 2. Update ONLY the project-store's activeProjectId
  //    This controls which per-project files the storage adapters read/write.
  //    DO NOT set activeProjectId on individual stores yet — that triggers persist
  //    writes which would overwrite per-project files with empty data.
  try {
    useProjectStore.getState().setActiveProject(newProjectId);
    console.log(`[ProjectSwitcher] setActiveProject completed, new activeProjectId: ${newProjectId.substring(0, 8)}`);
  } catch (e) {
    console.error('[ProjectSwitcher] Failed to set active project:', e);
    throw e;
  }

  // 3. Rehydrate all project-scoped stores FIRST
  //    The storage adapters call getActiveProjectId() → reads from project-store → newProjectId
  //    So they'll read from _p/{newProjectId}/ directory
  const rehydrateErrors: string[] = [];
  
  try {
    console.log(`[ProjectSwitcher] Rehydrating script store for ${newProjectId.substring(0, 8)}...`);
    await useScriptStore.persist.rehydrate();
    console.log(`[ProjectSwitcher] Script store rehydration complete`);
  } catch (e) {
    console.warn('[ProjectSwitcher] Failed to rehydrate script store:', e);
    rehydrateErrors.push(`script: ${e}`);
  }

  try {
    console.log(`[ProjectSwitcher] Rehydrating director store...`);
    await useDirectorStore.persist.rehydrate();
  } catch (e) {
    console.warn('[ProjectSwitcher] Failed to rehydrate director store:', e);
    rehydrateErrors.push(`director: ${e}`);
  }

  try {
    await useMediaStore.persist.rehydrate();
  } catch (e) {
    console.warn('[ProjectSwitcher] Failed to rehydrate media store:', e);
    rehydrateErrors.push(`media: ${e}`);
  }

  try {
    await useCharacterLibraryStore.persist.rehydrate();
  } catch (e) {
    console.warn('[ProjectSwitcher] Failed to rehydrate character library:', e);
    rehydrateErrors.push(`characters: ${e}`);
  }

  try {
    await useSceneStore.persist.rehydrate();
  } catch (e) {
    console.warn('[ProjectSwitcher] Failed to rehydrate scene store:', e);
    rehydrateErrors.push(`scenes: ${e}`);
  }

  try {
    await useSimpleTimelineStore.persist.rehydrate();
  } catch (e) {
    console.warn('[ProjectSwitcher] Failed to rehydrate timeline store:', e);
    rehydrateErrors.push(`timeline: ${e}`);
  }

  try {
    await useSClassStore.persist.rehydrate();
  } catch (e) {
    console.warn('[ProjectSwitcher] Failed to rehydrate sclass store:', e);
    rehydrateErrors.push(`sclass: ${e}`);
  }

  if (rehydrateErrors.length > 0) {
    console.warn(`[ProjectSwitcher] Rehydration errors: ${rehydrateErrors.join(', ')}`);
  }

  // 4. NOW sync internal activeProjectId in stores that track it.
  //    By this point, per-project data is already loaded into memory via rehydrate(),
  //    so the persist write triggered here will save the correct data (not empty defaults).
  try {
    console.log(`[ProjectSwitcher] Setting activeProjectId on stores...`);
    useScriptStore.getState().setActiveProjectId(newProjectId);
    useDirectorStore.getState().setActiveProjectId(newProjectId);
    useSClassStore.getState().setActiveProjectId(newProjectId);
    console.log(`[ProjectSwitcher] activeProjectId set on stores`);
  } catch (e) {
    console.warn('[ProjectSwitcher] Failed to set activeProjectId on stores:', e);
  }

  // 5. Ensure project data exists in stores that need it
  try {
    console.log(`[ProjectSwitcher] Ensuring project data exists...`);
    useScriptStore.getState().ensureProject(newProjectId);
    useDirectorStore.getState().ensureProject(newProjectId);
    useSClassStore.getState().ensureProject(newProjectId);
    console.log(`[ProjectSwitcher] Project data ensured`);
  } catch (e) {
    console.warn('[ProjectSwitcher] Failed to ensureProject:', e);
  }

  console.log(`[ProjectSwitcher] Switch complete → ${newProjectId.substring(0, 8)}`);
}
