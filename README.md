# 📺 Anime Diary · 追番记录

个人追番档案网站。公开页面按年份和季度展示看过的动画，只有管理员可以添加、编辑、删除、导入和恢复记录。

- 线上地址：[https://anime.zhanghome.qzz.io/](https://anime.zhanghome.qzz.io/)
- 当前分支：`main`
- 部署方式：GitHub 推送后由 Vercel 自动部署

## 主要功能

- **公开档案**：服务端读取记录并直接生成首屏，不再由浏览器重复请求数据。
- **年度档案**：右侧抽屉按年滚动浏览，每年展示高分海报行与部数、均分统计，点击直达详情。
- **高密度浏览**：按年份/评分/时间三个维度排列，升降序可切换；每个维度一行可左右滚动的紧凑海报行，时间维度为连续网格。
- **导航搜索**：搜索和筛选由导航栏按需打开，桌面端为居中浮层，手机端为底部抽屉。
- **组合筛选**：支持关键词、年份、季度、标签、最低评分和排序，并同步到可分享 URL。
- **沉浸式详情**：桌面端为居中双栏，手机端为近全屏抽屉；展示标签、感想和完整元数据。
- **管理后台**：记录、添加/编辑、备份恢复三个独立工作区，使用密码保护。
- **Bangumi 辅助录入**：搜索条目后预填标题、封面、季度、话数和候选标签，最终由管理员确认。
- **版本化备份**：修改前自动快照，支持差异预览、JSON 导入导出和历史恢复。
- **安全边界**：统一输入校验、管理写接口同源检查、认证 Cookie 和登录失败限流。
- **双存储实现**：本地开发使用 JSON，生产环境使用 Upstash Redis。

## 当前开发状态

截至 2026-08-05，以下阶段均已完成并进入 `main`：

1. Bangumi 辅助录入；
2. 服务端优先的公开档案与 URL 筛选；
3. 版本化备份、导入导出与恢复；
4. 管理后台信息架构；
5. 共享校验、错误反馈、同源保护和登录限流；
6. “水光档案”视觉系统；
7. 导航搜索、紧凑海报网格和沉浸式详情。

这些阶段的关键决策与代表提交见 [开发历程](./docs/DEVELOPMENT-HISTORY.md)。未来可独立考虑站外备份副本、更丰富的回顾视图和运行监控；它们不是当前版本的遗留任务。

## 技术栈

- Next.js 16（App Router）
- React 19 + TypeScript
- Tailwind CSS 4
- Framer Motion
- Upstash Redis / 本地 JSON
- Vitest + Testing Library
- Vercel

## 本地开发

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 环境变量

在 `.env.local` 中配置：

```dotenv
ADMIN_PASSWORD=你的管理密码
BANGUMI_USER_AGENT=你的Bangumi用户ID/anime-diary
BANGUMI_ACCESS_TOKEN=可选的Bangumi访问令牌
```

生产环境的数据存储还需要 Vercel/Upstash 提供下列任一组变量：

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`；
- `KV_REST_API_URL` + `KV_REST_API_TOKEN`；
- 兼容的 `REDIS_URL` 配置。

注意：

- `.env.local` 已被 Git 忽略，禁止提交密码、Token、Redis 地址或 Cookie。
- `BANGUMI_ACCESS_TOKEN` 只在服务端使用，不会发送到浏览器。
- 未配置 Redis 时会使用 `data/anime.json`，适合本地开发，不适合作为 Vercel 持久存储。

## 页面与接口

| 路径 | 权限 | 说明 |
|---|---|---|
| `/` | 公开 | 追番档案、筛选、年份浏览和详情 |
| `/login` | 公开 | 管理员登录 |
| `/admin` | 管理员 | 记录、添加/编辑、备份恢复 |
| `GET /api/anime` | 公开 | 读取全部记录；首页本身不依赖此接口 |
| `/api/anime/*` 写操作 | 管理员 | 新增、编辑和删除记录 |
| `/api/bangumi/*` | 管理员 | Bangumi 搜索和条目预填 |
| `/api/backups/*` | 管理员 | 备份列表、预览、导入、导出和恢复 |

## 数据与备份注意事项

- 每次添加、编辑、删除、导入或恢复前都会创建快照，默认保留最近 30 个。
- 恢复历史版本前会备份当前数据，因此恢复操作本身仍可撤回。
- JSON 导入支持旧版数组和新版 `anime-diary-backup` 格式；文件上限为 5 MB。
- 自动快照与生产数据默认存放在同一 Redis 中，可以防止误操作，但不能代替站外备份。
- 重要改动后建议在后台下载一次当前数据，保存到自己的设备或其他受控位置。

## 自己修改后如何提交和部署

当前仓库的 `main` 分支连接 Vercel。正常情况下，只要把提交推送到 GitHub 的 `main`，Vercel 就会自动构建和发布，不需要手动上传文件。

### 1. 修改前同步主分支

```powershell
git switch main
git pull --rebase origin main
git status
```

如果 `git status` 已经显示本地修改，先确认这些修改是不是你想保留的，不要直接覆盖或删除。

### 2. 修改并检查内容

```powershell
git status --short
git diff
```

只查看某个文件：

```powershell
git diff -- app/page.tsx
```

如果改了代码，建议在提交前运行：

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

只改 Markdown 时，可以只检查文档内容和链接，不必运行完整产品测试。

### 3. 只暂存本次修改

按文件添加，避免把其他尚未完成的工作一起提交：

```powershell
git add README.md
git add app\page.tsx components\some-component.tsx
git status --short
```

不建议在存在其他修改时直接使用 `git add .`。如果误暂存了文件，可撤销暂存但保留文件内容：

```powershell
git restore --staged path\to\file
```

### 4. 创建提交

```powershell
git commit -m "feat: 简短说明新增功能"
```

常用提交前缀：

- `feat:` 新功能；
- `fix:` 修复问题；
- `style:` 视觉和样式调整；
- `refactor:` 不改变功能的重构；
- `docs:` 文档修改；
- `test:` 测试修改；
- `chore:` 工具或维护工作。

一个提交尽量只包含一类相关修改，说明要写清楚“改了什么”。

### 5. 再同步并推送

```powershell
git pull --rebase origin main
git push origin main
```

如果 rebase 提示冲突：

1. 打开冲突文件，保留正确内容并删除冲突标记；
2. 执行 `git add 冲突文件`；
3. 执行 `git rebase --continue`；
4. 确认无误后再 `git push origin main`。

不要为了绕过冲突对 `main` 使用强制推送。

### 6. 等待 Vercel 自动部署

推送成功后：

1. 在 GitHub 确认 `main` 已出现刚才的提交；
2. 打开 Vercel 项目，等待 Production Deployment 显示成功；
3. 访问 [https://anime.zhanghome.qzz.io/](https://anime.zhanghome.qzz.io/)；
4. 强制刷新页面并检查刚修改的功能。

如果部署失败，先看 Vercel 的构建日志，不要反复创建空提交。修复后正常提交并再次推送即可。

### 7. 已推送版本需要撤回时

优先创建一个反向提交，不改写 `main` 历史：

```powershell
git log --oneline -10
git revert <需要撤回的提交ID>
git push origin main
```

`git revert` 会产生新提交，Vercel 随后自动部署撤回后的版本。

## 常用检查命令

```powershell
npm test             # 全部自动化测试
npm run test:watch   # 开发时监听测试
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript 类型检查
npm run build        # 生产构建
```

## 项目文档

- [系统架构](./docs/ARCHITECTURE.md)：当前组件、数据、存储、安全、备份与视觉边界。
- [开发历程](./docs/DEVELOPMENT-HISTORY.md)：已完成阶段、关键决策和代表提交。

## 许可证

MIT License

---

Made with ❤️ | 2026
