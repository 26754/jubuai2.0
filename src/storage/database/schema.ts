// Copyright (c) 2025 JuBu AI
// Licensed under AGPL-3.0-or-later. See LICENSE for details.
/**
 * JuBu AI 数据库 Schema
 * 使用 Drizzle ORM 定义表结构
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, boolean, unique } from 'drizzle-orm/pg-core';

// 用户项目表
export const userProjects = pgTable('user_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull().default('新项目'),
  description: text('description'),
  visualStyleId: varchar('visual_style_id', { length: 100 }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // 索引：按用户 ID 查询
  { indexName: 'idx_user_projects_user_id', columns: [table.userId] },
  // 索引：按更新时间排序
  { indexName: 'idx_user_projects_updated_at', columns: [table.updatedAt] },
]);

// 项目数据表（存储剧本、分镜、角色等）
export const projectData = pgTable('project_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => userProjects.id, { onDelete: 'cascade' }),
  dataType: varchar('data_type', { length: 50 }).notNull(), // 'script', 'shots', 'characters', 'assets'
  data: jsonb('data').notNull(),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // 唯一约束：每个项目每种数据类型只有一条记录
  { indexName: 'unique_project_data_type', columns: [table.projectId, table.dataType] },
  // 索引：按项目 ID 查询
  { indexName: 'idx_project_data_project_id', columns: [table.projectId] },
]);

// 项目协作表（可选，用于团队协作）
export const projectCollaborators = pgTable('project_collaborators', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => userProjects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).default('editor').notNull(), // 'owner', 'editor', 'viewer'
  invitedAt: timestamp('invited_at', { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
}, (table) => [
  // 唯一约束：每个用户对每个项目只能有一个协作记录
  { indexName: 'unique_collaborator_project', columns: [table.projectId, table.userId] },
]);

// 导出类型
export type UserProject = typeof userProjects.$inferSelect;
export type NewUserProject = typeof userProjects.$inferInsert;
export type ProjectData = typeof projectData.$inferSelect;
export type NewProjectData = typeof projectData.$inferInsert;
export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;
export type NewProjectCollaborator = typeof projectCollaborators.$inferInsert;
