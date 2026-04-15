# 视觉风格状态管理架构说明

## 设计原则

**单一数据源 (Single Source of Truth)**: 项目级别的视觉风格状态统一存储在 `project-store.ts` 中。

## 状态分层架构

### 1. 项目级别 (project-store.ts) - 单一数据源

```typescript
interface ProjectStore {
  // 当前活跃项目的视觉风格
  activeProject.visualStyleId: string;
  
  // 锁定状态 - 锁定后不自动跟随剧本变化
  visualStyleLocked: boolean;
  
  // 智能跟随 - 启用后自动应用剧本选择的风格
  visualStyleAutoFollow: boolean;
  
  // 记住上次选择的风格
  lastSelectedStyleId: string;
}
```

### 2. 剧本级别 (script-store.ts)

```typescript
interface ScriptProject {
  styleId: string;  // 剧本当前选中的风格
}
```

**同步机制**: `setStyleId()` 会同时更新 `script-store.ts` 和 `project-store.ts`

### 3. 资源级别 (scene-store, character-library-store)

```typescript
interface Scene {
  styleId?: string;  // 每个场景可以有不同的风格
}

interface Character {
  styleId?: string;  // 每个角色可以有风格标注
}
```

### 4. 组件级别 (各生成面板)

```typescript
// generation-panel.tsx
const [styleId, setStyleId] = useState<string>(DEFAULT_STYLE_ID);

// 监听项目级别变化并同步
useEffect(() => {
  if (visualStyleAutoFollow && projectStyleId !== styleId) {
    setStyleId(projectStyleId);
  }
}, [projectStyleId, visualStyleAutoFollow]);
```

## 为什么组件需要本地状态？

1. **独立性**: 每个面板可以有不同的初始样式
2. **锁定机制**: 锁定需要在组件层面阻止同步
3. **用户体验**: 用户选择样式后立即生效，不受其他操作影响
4. **性能**: 避免频繁的状态更新导致的重新渲染

## 数据流向图

```
用户选择样式 (场景面板)
       ↓
  setStyleId(styleId)
       ↓
  ┌────┴────┐
  ↓         ↓
更新组件  同步到 project-store
本地状态  (触发智能跟随广播)
          ↓
    ┌─────┴─────┐
    ↓           ↓
  场景保存   通知所有订阅者
  到 scene   (角色/分镜面板)
  -store    ↓
         组件自动同步
```

## 关键同步点

| 操作 | 同步位置 | 说明 |
|------|----------|------|
| 剧本选择风格 | `script-store.ts` → `project-store.ts` | 剧本变化时同步到项目 |
| 智能跟随启用 | `project-store.ts` → 各组件 | 项目变化时广播到所有面板 |
| 锁定样式 | `project-store.ts` | 阻止自动同步 |
| 场景选择样式 | `scene-store.ts` | 场景级别，不影响其他 |

## 最佳实践

1. **修改项目风格**: 使用 `useProjectStore().setProjectVisualStyle()`
2. **读取项目风格**: 使用 `useProjectStore(state => state.activeProject?.visualStyleId)`
3. **组件锁定/解锁**: 使用 `useProjectStore().setVisualStyleLocked()`
4. **智能跟随控制**: 使用 `useProjectStore().setVisualStyleAutoFollow()`

## 注意事项

- **不要**在组件中直接修改 `project-store.ts` 的状态
- **始终**使用提供的 setter 方法
- **锁定**后，组件不会跟随项目变化，但用户仍可手动切换
- **智能跟随**仅在未锁定时生效
