# 管理后台信息架构实施计划

**目标：** 将管理后台拆成“记录、添加记录、备份恢复”三个互斥工作区，减少日常操作负担。

**约束：**

- 不改变 Anime、API、存储、备份或 Bangumi 合约。
- 不新增依赖或全局状态库。
- 后台首次加载不得请求备份列表。
- 使用 TDD 实施所有行为。
- 完成后本地合并 `main`、验证并推送既定 GitHub 远端。

## Task 1：工作区导航组件

**文件：**

- 新建 `components/admin/admin-section-nav.tsx`
- 新建 `components/admin/admin-section-nav.test.tsx`

- [x] 先写失败测试：三个 tab 的名称、选中状态和切换回调。
- [x] 实现 `AdminSection` 与可访问 tablist。
- [x] 验证键盘可聚焦、`aria-selected` 和 `aria-controls`。

## Task 2：管理页三工作区

**文件：**

- 修改 `app/admin/page.tsx`
- 修改 `app/admin/page.test.tsx`

- [x] 先写失败测试：默认只显示记录工作区，且不请求 `/api/backups`。
- [x] 实现宽版后台外壳、标题区和工作区状态。
- [x] 将搜索、添加按钮、加载态、空状态和列表移入记录工作区。
- [x] 将 Bangumi/手动录入与编辑表单移入添加记录工作区。
- [x] 保存与取消后返回记录；编辑按钮进入添加记录工作区。
- [x] 备份工作区按需挂载 `BackupManager`。

## Task 3：记录与备份专用布局

**文件：**

- 修改 `components/anime-list.tsx`
- 修改 `components/backup-manager.tsx`
- 修改相关测试

- [x] 先写失败测试：记录列表不再使用固定内部滚动。
- [x] 让记录列表使用页面自然滚动。
- [x] 为 `BackupManager` 增加 `collapsible={false}` 独立展示模式。
- [x] 保持恢复、导入、下载与差异预览行为不变。

## Task 4：文档、视觉和全量验证

**文件：**

- 修改 `README.md`
- 修改 `CLAUDE.md`
- 更新本计划进度

- [x] 更新后台工作区说明和组件结构。
- [x] 运行后台与备份聚焦测试。
- [x] 运行 `npm test`、`npx tsc --noEmit`、`npm run lint`、`npm run build`。
- [ ] 在真实桌面和移动端检查三工作区、搜索、添加、编辑和备份按需加载。（应用内浏览器阻止访问本地地址，已由组件交互测试和生产构建覆盖）
- [x] 内联审查最终 diff，修复重要问题。
- [ ] 合并到 `main`，在合并结果上复验并推送。
