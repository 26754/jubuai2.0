import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, jsonb, index, text } from "drizzle-orm/pg-core";

// ==================== 用户扩展信息表 ====================
export const profiles = pgTable(
  "profiles",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // 关联 auth.users.id
    username: varchar("username", { length: 128 }),
    avatar_url: text("avatar_url"),
    settings: jsonb("settings"), // 用户设置 JSON
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("profiles_created_at_idx").on(table.created_at),
  ]
);

// ==================== 项目表 ====================
export const projects = pgTable(
  "projects",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    user_id: varchar("user_id", { length: 36 }).notNull().default(sql`auth.uid()`),
    name: varchar("name", { length: 255 }).notNull(),
    
    // 剧本数据（JSONB）- 包含 title, characters, scenes, episodes 等
    script_data: jsonb("script_data"),
    
    // 全局视觉风格
    visual_style_id: varchar("visual_style_id", { length: 50 }),
    
    // 原始剧本文本
    raw_script: text("raw_script"),
    
    // 语言设置
    language: varchar("language", { length: 10 }).default("zh-CN"),
    
    // 目标时长
    target_duration: varchar("target_duration", { length: 50 }),
    
    // 风格 ID
    style_id: varchar("style_id", { length: 50 }),
    
    // 解析状态
    parse_status: varchar("parse_status", { length: 20 }).default("pending"),
    
    // 元数据
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("projects_user_id_idx").on(table.user_id), // RLS 策略需要
    index("projects_created_at_idx").on(table.created_at),
    index("projects_updated_at_idx").on(table.updated_at),
  ]
);

// ==================== 分镜表 ====================
export const shots = pgTable(
  "shots",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    user_id: varchar("user_id", { length: 36 }).notNull().default(sql`auth.uid()`),
    
    // 关联项目
    project_id: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
    
    // 所属集和场景
    episode_id: varchar("episode_id", { length: 36 }),
    scene_id: varchar("scene_id", { length: 36 }),
    
    // 分镜基本信息
    index: jsonb("index_data").$type<{
      shot_number: number;
      episode_index?: number;
      scene_index?: number;
    }>(),
    
    // 分镜内容
    content: jsonb("content").$type<{
      action_summary: string;
      visual_description?: string;
      dialogue?: string;
      duration?: number;
    }>(),
    
    // 镜头语言
    camera: jsonb("camera").$type<{
      shot_size?: string;
      camera_movement?: string;
      camera_angle?: string;
      special_technique?: string;
      focal_length?: string;
    }>(),
    
    // 视觉生成
    visual: jsonb("visual").$type<{
      image_prompt?: string;
      image_prompt_zh?: string;
      video_prompt?: string;
      video_prompt_zh?: string;
      image_url?: string;
      video_url?: string;
      needs_end_frame?: boolean;
    }>(),
    
    // 角色信息
    characters: jsonb("characters").$type<{
      character_ids: string[];
      character_variations: Record<string, string>;
    }>(),
    
    // 状态
    status: varchar("status", { length: 20 }).default("pending"),
    shot_status: varchar("shot_status", { length: 20 }).default("pending"),
    
    // 元数据
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("shots_user_id_idx").on(table.user_id), // RLS 策略需要
    index("shots_project_id_idx").on(table.project_id), // 外键必须有索引
    index("shots_episode_id_idx").on(table.episode_id),
    index("shots_scene_id_idx").on(table.scene_id),
    index("shots_status_idx").on(table.status),
    index("shots_created_at_idx").on(table.created_at),
  ]
);

// ==================== 系统表（保持不变）====================
export const healthCheck = pgTable("health_check", {
  id: sql`serial().notNull()`,
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});
