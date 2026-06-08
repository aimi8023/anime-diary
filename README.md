# 📺 追番记录

一个个人追番记录网站，按季度记录和浏览追过的番剧。采用轻盈的毛玻璃设计风格，清新明亮的视觉体验。

## ✨ 功能特性

- **首页展示**：按季度分类浏览番剧卡片（评分倒序排列）
- **实时计时**：显示本站运行时间（从2026年1月1日开始）
- **搜索功能**：支持按番剧名称快速搜索
- **管理后台**：密码保护的管理页面，可添加、编辑、删除番剧
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

### 页面路由

- **首页 `/`** — 按季度浏览番剧，支持搜索和实时计时
- **管理页 `/admin`** — 添加、编辑、删除番剧（需密码登录）
- **登录页 `/login`** — 管理后台密码验证

### 功能说明

#### 首页功能
- **实时计时器**：显示"本站已运行 XX天 XX时 XX分 XX秒"
- **搜索框**：点击"搜索"按钮展开，按番剧名称过滤
- **统计胶囊**：显示总番剧数和季度数
- **季度折叠**：点击季度标题可展开/收起

#### 管理页功能
- **搜索栏**：在标题栏中集成搜索框，快速查找番剧
- **年份选择**：数字输入框 + 增减按钮（1900-2100，默认2026）
- **季度选择**：春季-1月、夏季-4月、秋季-7月、冬季-10月
- **评分滑块**：1.0-10.0 范围，实时显示星星预览
- **表单验证**：必填项检查、错误提示

##  部署到 Vercel

1. 把项目推到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 用 GitHub 登录，导入该项目
3. 如果想在线编辑数据，需要在 Vercel Marketplace 添加 Upstash Redis 集成
4. Vercel 会自动设置 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 环境变量
5. 部署完成后，得到一个 `xxx.vercel.app` 公网地址

> ️ **注意**：如果不配置 Upstash Redis，数据将存在本地 JSON 文件中，每次部署后重置为仓库中的数据。适合只读展示。

## 📝 配置文件

- **[THEME-CONFIG.md](./THEME-CONFIG.md)** - 毛玻璃透明度调整指南
- **[app/globals.css](./app/globals.css)** - 全局样式定义
- **[components/timer.tsx](./components/timer.tsx)** - 实时计时器组件

## 🎯 主要组件

- `components/anime-card.tsx` - 番剧卡片（统一高度，无状态标签）
- `components/anime-form.tsx` - 表单组件（滑块评分、年份增减）
- `components/anime-list.tsx` - 列表组件（支持搜索过滤）
- `components/season-section.tsx` - 季度区块（可折叠）
- `components/star-rating.tsx` - 星级评分
- `components/timer.tsx` - 实时计时器

## 🔧 自定义配置

如需调整毛玻璃透明度、模糊强度等参数，请查看 [THEME-CONFIG.md](./THEME-CONFIG.md)。

推荐预设方案：
- **更透明**：background: rgba(255, 255, 255, 0.25), blur(8px)
- **平衡（当前）**：background: rgba(255, 255, 255, 0.35), blur(10px)
- **更实**：background: rgba(255, 255, 255, 0.55), blur(15px)

## 📄 许可证

MIT License

---

Made with ❤️ | 2026
