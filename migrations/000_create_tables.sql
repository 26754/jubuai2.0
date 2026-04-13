-- JuBu AI 数据库表结构
-- 运行此 SQL 创建所需的表

-- 1. 用户项目表
CREATE TABLE IF NOT EXISTS user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT '新项目',
  description TEXT,
  visual_style_id VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 索引：按用户 ID 查询
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);

-- 索引：按更新时间排序
CREATE INDEX IF NOT EXISTS idx_user_projects_updated_at ON user_projects(updated_at DESC);

-- 2. 项目数据表
CREATE TABLE IF NOT EXISTS project_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES user_projects(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  version INT DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, data_type)
);

-- 索引：按项目 ID 查询
CREATE INDEX IF NOT EXISTS idx_project_data_project_id ON project_data(project_id);

-- 3. 项目协作表（可选，用于团队协作）
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES user_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'editor' NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ
);

-- 唯一约束：每个用户对每个项目只能有一个协作记录
CREATE UNIQUE INDEX IF NOT EXISTS unique_collaborator_project 
ON project_collaborators(project_id, user_id);

-- 索引：按项目 ID 查询协作者
CREATE INDEX IF NOT EXISTS idx_project_collaborators_project_id ON project_collaborators(project_id);

-- 索引：按用户 ID 查询协作项目
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON project_collaborators(user_id);

-- 4. 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 user_projects 表创建触发器
DROP TRIGGER IF EXISTS update_user_projects_updated_at ON user_projects;
CREATE TRIGGER update_user_projects_updated_at
  BEFORE UPDATE ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 project_data 表创建触发器
DROP TRIGGER IF EXISTS update_project_data_updated_at ON project_data;
CREATE TRIGGER update_project_data_updated_at
  BEFORE UPDATE ON project_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
