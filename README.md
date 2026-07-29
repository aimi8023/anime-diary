# 📺 追番记录

一个个人追番记录网站，按季度记录和浏览追过的番剧。采用轻盈的毛玻璃设计风格，清新明亮的视觉体验。

## ✨ 功能特性

- **首页展示**：按季度分类浏览番剧卡片（评分倒序排列），季度标题显示月份
- **实时计时**：显示本站运行时间（从2026年1月1日开始）
- **全局搜索**：Header 中弹出式搜索面板，支持按名称、年份、标签、评分多条件筛选
- **标签系统**：番剧支持自定义标签，首页卡片展示标签，管理页可增删
- **管理后台**：密码保护的管理页面，可添加、编辑、删除番剧，支持数据导出
- **Bangumi 辅助录入**：按需搜索动画条目，选择后预填资料和候选标签
- **优雅交互**：平滑动画效果、悬浮光效、响应式设计
- **数据存储**：本地 JSON 文件（开发）/ Upstash Redis（生产）

## 🎨 设计风格

- **毛玻璃效果**：35% 透明度 + 10px 模糊，轻盈通透
- **配色方案**：白色背景 + 粉色/蓝色渐变主题
- **圆角设计**：统一使用 12-16px 圆角
- **文字颜色**：深灰色主文字，彩色强调元素
- **卡片高度**：统一高度，底部信息对齐

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

- **首页 `/`** — 按季度浏览番剧，全局搜索，实时计时
- **管理页 `/admin`** — 添加、编辑、删除番剧（需密码登录）
- **登录页 `/login`** — 管理后台密码验证

### 功能说明

#### 首页功能
- **实时计时器**：显示"本站已运行 XX天 XX时 XX分 XX秒"
- **全局搜索**：点击 Header 搜索按钮弹出面板，支持按名称/年份/标签/评分筛选
- **统计胶囊**：显示总番剧数和季度数，搜索时显示筛选计数
- **季度折叠**：点击季度标题展开/收起，格式为"2023年秋季 - 7月"

#### 管理页功能
- **Bangumi 辅助录入**：输入中日文标题搜索，选择正确条目后预填标题、封面、季度和话数
- **候选标签**：Bangumi 标签不会自动加入，点击需要的标签后才保存
- **手动兜底**：Bangumi 不可用时可以随时切换到手动填写
- **本地快照**：保存后公开页面只读取本站数据，不实时依赖 Bangumi
- **重复保护**：相同 Bangumi 条目会提示并打开已有记录
- **搜索栏**：在标题栏中集成搜索框，快速查找番剧
- **标签管理**：输入框添加标签，支持回车快捷添加，点击删除标签
- **年份输入**：数字输入框
- **季度选择**：春季-1月、夏季-4月、秋季-7月、冬季-10月
- **评分滑块**：1.0-10.0 范围，实时显示星星预览
- **数据导出**：一键导出为 JSON 文件下载

## ☁️ 部署到 Vercel

1. 把项目推到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 用 GitHub 登录，导入该项目
3. 如果想在线编辑数据，需要在 Vercel Marketplace 添加 Upstash Redis 集成
4. Vercel 会自动设置 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 环境变量
5. 部署完成后，得到一个 `xxx.vercel.app` 公网地址

> ⚠️ **注意**：如果不配置 Upstash Redis，数据将存在本地 JSON 文件中，每次部署后重置为仓库中的数据。适合只读展示。

## 📝 配置文件

- **[THEME-CONFIG.md](./THEME-CONFIG.md)** - 毛玻璃透明度调整指南
- **[app/globals.css](./app/globals.css)** - 全局样式定义
- **[components/timer.tsx](./components/timer.tsx)** - 实时计时器组件

## 🎯 主要组件

- `components/anime-card.tsx` - 番剧卡片（展示标签、统一高度）
- `components/anime-form.tsx` - 表单组件（标签管理、评分滑块）
- `components/anime-list.tsx` - 列表组件（支持搜索过滤）
- `components/season-section.tsx` - 季度区块（可折叠，显示月份）
- `components/star-rating.tsx` - 星级评分
- `components/timer.tsx` - 实时计时器
- `components/search-context.tsx` - 全局搜索状态管理
- `components/search-filter.tsx` - 搜索弹出面板（多条件筛选）
- `components/search-button-client.tsx` - Header 搜索按钮

## 🔧 自定义配置

如需调整毛玻璃透明度、模糊强度等参数，请查看 [THEME-CONFIG.md](./THEME-CONFIG.md)。

推荐预设方案：
- **更透明**：background: rgba(255, 255, 255, 0.25), blur(8px)
- **平衡（当前）**：background: rgba(255, 255, 255, 0.35), blur(10px)
- **更实**：background: rgba(255, 255, 255, 0.55), blur(15px)

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
