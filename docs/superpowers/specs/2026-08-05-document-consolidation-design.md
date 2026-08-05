# 项目文档精简与融合设计

**日期：** 2026-08-05  
**状态：** 已确认  
**范围：** 项目 Markdown 说明与明确无用的空目录；不修改产品代码

## 目标

把当前分散在根目录、7 份设计稿和 7 份实施计划中的重复信息压缩为三个长期维护入口，让项目所有者能快速了解项目、维护架构并自行提交部署。

## 最终文档结构

### `README.md`

面向项目所有者和普通开发者，保留：

- 项目简介、线上地址与功能概览；
- 技术栈、本地启动、环境变量和管理功能；
- 当前开发状态；
- “自行修改后如何提交与部署”流程，包括检查修改、暂存、提交、推送、Vercel 自动部署和线上确认；
- 指向架构与开发历史文档的链接。

### `docs/ARCHITECTURE.md`

融合 `CLAUDE.md`、`THEME-CONFIG.md` 和现有设计稿中的仍然有效内容，记录当前状态而非实施过程：

- 目录与组件边界；
- 数据模型、存储和公开首页数据流；
- Bangumi 辅助录入；
- 备份恢复、安全和权限；
- UI 结构、主题令牌、响应式和可访问性；
- 修改代码时需要保持的架构约束。

### `docs/DEVELOPMENT-HISTORY.md`

用时间线概括已完成的七个开发阶段：Bangumi 辅助录入、公开档案数据流、版本化备份、后台信息架构、安全边界、视觉系统、紧凑档案搜索与详情。每个阶段只保留目标、结果、关键决策和代表提交。

Git 历史继续保存被删除文档的完整细节，因此不在新文档中复制逐步实施指令和测试代码片段。

## 删除范围

完成内容迁移后删除：

- `CLAUDE.md`；
- `THEME-CONFIG.md`；
- `docs/superpowers/specs/` 下的旧设计稿；
- `docs/superpowers/plans/` 下的全部实施计划；
- 本地未跟踪且为空的 `scripts/` 目录。

本设计记录也属于过渡材料：其内容落实到长期文档并进入 Git 历史后，与其他 `docs/superpowers/` 文档一起删除。

## 明确保留

- `.env.local`：本地私密配置，不提交、不删除；
- `node_modules/`、`.next/`、`tsconfig.tsbuildinfo`：可再生成且已被 Git 忽略，本次不处理；
- `.worktrees/admin-information-architecture`：仍登记在 Git 中的独立工作树，本次不处理；
- `components/archive/archive-hero.tsx`：已有未提交修改，视为项目所有者的工作，完全不触碰；
- 所有源码、测试、数据、静态资源和配置文件。

## README 提交与部署流程

README 使用 `main` 直推流程说明当前项目的实际部署方式：

```powershell
git status
git diff
git add <修改的文件>
git commit -m "类型: 简短说明"
git push origin main
```

同时说明：

- 提交前不要把 `.env.local`、密码或 Token 加入 Git；
- 推荐按文件暂存，避免把无关修改一起提交；
- 推送 `main` 后由 Vercel 自动部署；
- 在 GitHub/Vercel 确认部署状态，再访问 `https://anime.zhanghome.qzz.io/` 检查结果；
- 推送失败时先执行 `git pull --rebase origin main`，解决冲突后再推送，禁止随意强推。

## 完成标准

1. 仓库长期 Markdown 从 17 份精简为 3 份。
2. README 能独立指导本地开发、手动提交和自动部署。
3. ARCHITECTURE 不依赖已删除文档即可解释当前系统。
4. DEVELOPMENT-HISTORY 能说明项目为何形成当前结构。
5. 所有 Markdown 链接指向仍存在的文件。
6. 不修改或覆盖项目所有者的未提交代码。
7. 本轮为文档整理，不运行产品测试。
