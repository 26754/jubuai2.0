-- JuBu AI 数据库 RLS 策略
-- 为 user_projects 和 project_data 表配置行级安全策略

-- 1. 启用 user_projects 表的 RLS
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;

-- 2. user_projects 插入策略：仅所有者可以插入
CREATE POLICY "用户只能创建自己的项目"
ON user_projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. user_projects 查看策略：仅所有者可以查看
CREATE POLICY "用户只能查看自己的项目"
ON user_projects
FOR SELECT
USING (auth.uid() = user_id);

-- 4. user_projects 更新策略：仅所有者可以更新
CREATE POLICY "用户只能更新自己的项目"
ON user_projects
FOR UPDATE
USING (auth.uid() = user_id);

-- 5. user_projects 删除策略：仅所有者可以删除
CREATE POLICY "用户只能删除自己的项目"
ON user_projects
FOR DELETE
USING (auth.uid() = user_id);

-- 6. 启用 project_data 表的 RLS
ALTER TABLE project_data ENABLE ROW LEVEL SECURITY;

-- 7. project_data 插入策略：仅项目所有者可以插入
CREATE POLICY "项目所有者可以插入项目数据"
ON project_data
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.id = project_data.project_id
    AND user_projects.user_id = auth.uid()
  )
);

-- 8. project_data 查看策略：仅项目所有者可以查看
CREATE POLICY "项目所有者可以查看项目数据"
ON project_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.id = project_data.project_id
    AND user_projects.user_id = auth.uid()
  )
);

-- 9. project_data 更新策略：仅项目所有者可以更新
CREATE POLICY "项目所有者可以更新项目数据"
ON project_data
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.id = project_data.project_id
    AND user_projects.user_id = auth.uid()
  )
);

-- 10. project_data 删除策略：仅项目所有者可以删除
CREATE POLICY "项目所有者可以删除项目数据"
ON project_data
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.id = project_data.project_id
    AND user_projects.user_id = auth.uid()
  )
);

-- 11. 启用 project_collaborators 表的 RLS
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- 12. project_collaborators 插入策略：所有者可以添加协作者
CREATE POLICY "项目所有者可以添加协作者"
ON project_collaborators
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.id = project_collaborators.project_id
    AND user_projects.user_id = auth.uid()
  )
);

-- 13. project_collaborators 查看策略：协作者可以查看
CREATE POLICY "协作者可以查看协作信息"
ON project_collaborators
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.id = project_collaborators.project_id
    AND user_projects.user_id = auth.uid()
  )
);

-- 14. project_collaborators 更新策略：所有者可以更新
CREATE POLICY "项目所有者可以更新协作信息"
ON project_collaborators
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.id = project_collaborators.project_id
    AND user_projects.user_id = auth.uid()
  )
);

-- 15. project_collaborators 删除策略：所有者可以删除
CREATE POLICY "项目所有者可以删除协作者"
ON project_collaborators
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.id = project_collaborators.project_id
    AND user_projects.user_id = auth.uid()
  )
);
