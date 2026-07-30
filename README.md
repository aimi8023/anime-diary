# 📺 追番记录

一个个人追番记录网站，按季度记录和浏览追过的番剧。采用“水光档案”视觉系统，在保留粉蓝插画氛围的同时提供稳定清晰的阅读体验。

## ✨ 功能特性

- **公开档案**：首页由服务端一次读取记录，首屏直接展示，不再等待客户端二次请求
- **档案浏览**：按年份和季度折叠浏览，点击卡片可查看完整资料与个人感想
- **组合筛选**：支持关键词、年份、季度、标签、最低评分和排序，筛选条件可通过 URL 分享
- **实时计时**：显示本站运行时间
- **标签系统**：番剧支持自定义标签，首页卡片展示标签，管理页可增删
- **管理后台**：密码保护的“记录、添加记录、备份恢复”三个独立工作区
- **Bangumi 辅助录入**：按需搜索动画条目，选择后预填资料和候选标签
- **备份与恢复**：每次修改前自动保存历史版本，支持差异预览、JSON 导入导出和一键恢复
- **安全边界**：所有管理写操作要求同源请求，番剧输入统一校验，登录失败自动限流
- **统一体验**：公开档案、登录和后台共享同一套控件、状态、焦点与响应式规则
- **数据存储**：本地 JSON 文件（开发）/ Upstash Redis（生产）

## 🎨 设计风格

- **水光档案**：粉蓝插画作为氛围层，瓷白表面保证内容对比度
- **语义配色**：樱粉主操作、湖蓝辅助信息、琥珀评分、红色危险状态
- **海报优先**：公开作品卡片使用 2:3 封面比例，减少竖版封面裁切
- **一致控件**：按钮、输入框、标签、面板和反馈共享全局设计令牌
- **可访问动效**：键盘焦点清晰，所有动效遵守 `prefers-reduced-motion`

详细配置请参考 [THEME-CONFIG.md](./THEME-CONFIG.md)

## 🛠️ 技术栈

- **框架**：Next.js 16 + TypeScript
- **样式**：Tailwind CSS 4
- **动画**：framer-motion
- **数据存储**：本地 JSON / Upstash Redis

## 🚀 本地开发

```bash
npm install
npm run dev
```

打开 http://localhost:3000 即可访问。

### 环境变量

复制 `.env.local.example` 为 `.env.local`，并填写：

```dotenv
ADMIN_PASSWORD=你的管理密码
BANGUMI_USER_AGENT=你的Bangumi用户ID/anime-diary
BANGUMI_ACCESS_TOKEN=可选的Bangumi访问令牌
```

- `BANGUMI_USER_AGENT` 应能识别项目所有者，遵循 [Bangumi User-Agent 规范](https://github.com/bangumi/api/blob/master/docs-raw/user%20agent.md)。
- 可在 [Bangumi Access Token 页面](https://next.bgm.tv/demo/access-token)生成令牌。
- Token 只由服务端读取，不会发送到浏览器；生产部署建议配置。
- `.env.local` 包含私密信息，已经被 Git 忽略，不要提交。

### 页面路由

- **首页 `/`** — 服务端加载的公开追番档案、组合筛选、详情回顾和实时计时
- **管理页 `/admin`** — 查找维护、添加编辑和备份恢复三个工作区（需密码登录）
- **登录页 `/login`** — 管理后台密码验证

### 功能说明

#### 首页功能
- **实时计时器**：显示"本站已运行 XX天 XX时 XX分 XX秒"
- **服务端首屏**：服务端直接读取一次存储并生成首页；读取失败会显示可重试错误，不会伪装成空档案
- **组合筛选**：关键词、年份、季度、标签、最低评分和排序使用 AND 语义，可逐项或全部清除
- **可分享 URL**：使用 `q`、`year`、`season`、`tag`、`rating`、`sort` 参数保存当前浏览条件
- **年份/季度折叠**：年份由新到旧展示，最新年份默认展开，季度和旧年份均可独立展开
- **记录详情**：卡片打开完整详情面板，支持关闭按钮、点击遮罩和 Escape 键
- **公开 API 兼容**：`GET /api/anime` 仍可公开读取，但首页不再通过它二次获取数据

#### 管理页功能
- **专注工作区**：记录、添加记录、备份恢复互斥展示，减少日常操作中的信息干扰
- **按需备份**：首次进入后台只读取番剧记录，打开备份工作区后才请求历史版本
- **Bangumi 辅助录入**：输入中日文标题搜索，选择正确条目后预填标题、封面、季度和话数
- **候选标签**：Bangumi 标签不会自动加入，点击需要的标签后才保存
- **手动兜底**：Bangumi 不可用时可以随时切换到手动填写
- **本地快照**：保存后公开页面只读取本站数据，不实时依赖 Bangumi
- **重复保护**：相同 Bangumi 条目会提示并打开已有记录
- **搜索栏**：在记录工作区快速查找番剧，长列表使用页面自然滚动
- **标签管理**：输入框添加标签，支持回车快捷添加，点击删除标签
- **年份输入**：数字输入框
- **季度选择**：春季-1月、夏季-4月、秋季-7月、冬季-10月
- **评分滑块**：1.0-10.0 范围，实时显示星星预览
- **自动快照**：添加、编辑、删除、导入和恢复前自动保存当前数据，保留最近 30 个版本
- **差异预览**：恢复或导入前显示将新增、移除和修改的记录数量
- **可逆恢复**：恢复历史版本前会再次备份当前数据，选错版本后仍能恢复回来
- **JSON 导入导出**：服务端导出最新数据；导入兼容旧版数组文件和新版带版本信息的备份文件
- **空数据保护**：导入空备份需要额外确认，非法或重复记录不会写入
- **统一输入校验**：新增与编辑共享服务端规则，错误类型、评分、话数、标签和外部链接不会被静默写入
- **同源写保护**：登录、退出、番剧增删改、备份导入和恢复均拒绝外域或缺失来源的请求
- **登录限流**：同一客户端 15 分钟内连续失败 5 次后暂时限制；成功登录会清除失败记录
- **一致错误反馈**：API 使用兼容错误结构，管理页以可访问的行内提示显示读取、保存和删除错误

## ☁️ 部署到 Vercel

1. 把项目推到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 用 GitHub 登录，导入该项目
3. 如果想在线编辑数据，需要在 Vercel Marketplace 添加 Upstash Redis 集成
4. Vercel 会自动设置 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 环境变量
5. 部署完成后，得到一个 `xxx.vercel.app` 公网地址

> ⚠️ **注意**：如果不配置 Upstash Redis，数据将存在本地 JSON 文件中，每次部署后重置为仓库中的数据。适合只读展示。

### 备份注意事项

- 自动快照与当前数据默认保存在同一个 Upstash Redis 数据库中，可以防止误删、错误编辑和导入失误，但不能抵御整个数据库或账号不可用。
- 新版本部署完成后，建议先在管理页点击“下载当前数据”，保存一份站外基线备份。
- 此功能不需要新增环境变量。将来可以在现有备份格式和存储接口上增加对象存储等外部副本。

### 登录限流注意事项

- 配置现有 Upstash Redis 时，失败次数会在 Vercel 多实例间共享。
- 未配置 Redis 时使用单进程内存限流，适合本地开发，但生产部署的不同实例不会共享计数。
- Redis 中只保存客户端 IP 的 SHA-256 摘要片段，不保存明文 IP。

## 📝 配置文件

- **[THEME-CONFIG.md](./THEME-CONFIG.md)** - 水光档案令牌与主题调整指南
- **[app/globals.css](./app/globals.css)** - 全局样式定义
- **[components/timer.tsx](./components/timer.tsx)** - 实时计时器组件

## 🎯 主要组件

- `components/site-header.tsx` - 服务端渲染的站点导航
- `components/archive/archive-browser.tsx` - 公开档案筛选、URL 同步和详情状态
- `components/archive/archive-toolbar.tsx` - 桌面与移动端组合筛选
- `components/archive/archive-results.tsx` - 年份/季度档案浏览
- `components/archive/anime-detail-dialog.tsx` - 完整记录详情面板
- `components/admin/admin-section-nav.tsx` - 后台工作区导航
- `components/anime-form.tsx` - 表单组件（标签管理、评分滑块）
- `components/anime-list.tsx` - 后台记录列表
- `components/backup-manager.tsx` - 备份导入、导出、差异预览与恢复
- `components/feedback/inline-feedback.tsx` - 统一错误与成功反馈语义
- `components/star-rating.tsx` - 星级评分
- `components/timer.tsx` - 实时计时器

公开档案的解析、筛选、排序、分组和统计纯函数位于 `lib/archive/`。
番剧输入校验位于 `lib/anime/validation.ts`，HTTP/客户端错误边界位于 `lib/http/`，登录限流位于 `lib/auth/rate-limit.ts`。

## 🔧 自定义配置

颜色、表面透明度、阴影、圆角和动效时长统一由 `app/globals.css` 的 `:root` 令牌控制。调整方式与语义类清单见 [THEME-CONFIG.md](./THEME-CONFIG.md)。

## ✅ 测试与检查

```bash
npm test             # 运行全部自动化测试
npm run test:watch   # 开发时监听测试
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript 类型检查
npm run build        # 生产构建
```

## 📄 许可证

MIT License

---

Made with ❤️ | 2026
