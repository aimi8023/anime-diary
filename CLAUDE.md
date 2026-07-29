# Anime Diary — 追番日记

一个个人追番记录网站，按季度记录和浏览追过的番剧。采用轻盈的毛玻璃设计风格，清新明亮的视觉体验。支持公网访问，管理功能密码保护。

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 样式 | Tailwind CSS 4 |
| 动效 | framer-motion |
| 存储（开发） | 本地 JSON 文件 `data/anime.json` |
| 存储（生产） | Upstash Redis (`@upstash/redis`) |
| 部署 | Vercel (免费) |
| ID 生成 | nanoid |

## 项目结构

```
anime-diary/
├── proxy.ts                         ← 路由守卫（密码保护 middleware）
├── .env.local                       ← ADMIN_PASSWORD=123456
├── lib/
│   ├── types.ts                     ← Anime 数据模型（tags 字段，无 status）
│   ├── archive/
│   │   ├── types.ts                 ← 公开档案筛选、分组和统计类型
│   │   └── filter.ts                ← URL 解析、筛选、排序、分组纯函数
│   ├── storage.ts                   ← Storage 接口
│   ├── storage-json.ts              ← JSON 文件存储实现
│   ├── storage-kv.ts                ← Upstash Redis 存储实现
│   └── storage-factory.ts           ← 根据环境自动选择存储
├── app/
│   ├── layout.tsx                   ← 全局布局（服务端 Header/Footer）
│   ├── page.tsx                     ← 服务端读取一次数据的公开档案首页
│   ├── globals.css                  ← 白粉主题 + 毛玻璃效果
│   ├── login/page.tsx               ← 登录页
│   ├── admin/page.tsx               ← 三工作区管理页（记录、添加、备份）
│   └── api/
│       ├── auth/route.ts            ← 登录/登出 API
│       └── anime/
│           ├── route.ts             ← GET 全部 / POST 新增
│           └── [id]/route.ts        ← PUT 更新 / DELETE 删除
├── components/
│   ├── site-header.tsx              ← 服务端站点导航
│   ├── archive/
│   │   ├── archive-browser.tsx      ← 筛选、URL 同步与详情状态
│   │   ├── archive-toolbar.tsx      ← 桌面/移动组合筛选
│   │   ├── archive-results.tsx      ← 年份和季度结果
│   │   └── anime-detail-dialog.tsx  ← 可访问的记录详情面板
│   ├── admin/
│   │   └── admin-section-nav.tsx    ← 后台工作区导航
│   ├── star-rating.tsx              ← 星星评分（支持 0.5 步长）
│   ├── anime-form.tsx               ← 表单组件（标签管理、评分滑块）
│   ├── anime-list.tsx               ← 管理记录列表（页面自然滚动）
│   ├── backup-manager.tsx           ← 备份导入、导出、预览与恢复
│   └── timer.tsx                    ← 实时计时器（本站运行时间）
├── data/anime.json                  ← 示例数据（本地开发用，含 tags）
└── public/                          ← 静态资源（bg.png 背景图）
```

## 数据模型

```typescript
interface Anime {
  id: string;         // nanoid(12)
  title: string;      // 番剧标题
  season: string;     // 如 "2024秋"、"2024冬"
  cover: string;      // 封面图片 URL
  rating: number;     // 1.0-10.0，步长 0.5
  comment: string;    // 短评
  episodes: number;   // 总话数
  tags: string[];     // 标签数组
  createdAt: string;  // ISO 时间戳
}
```

**注意**：已移除 `status` 字段（想看/在看/看完/弃番），新增 `tags` 字段。

## 路由与权限

| 路由 | 权限 | 说明 |
|------|------|------|
| `/` | 公开 | 服务端首屏的追番档案，支持 URL 组合筛选和年份/季度浏览 |
| `/login` | 公开 | 密码登录页 |
| `/admin` | 需登录 | 记录、添加记录、备份恢复三个互斥工作区 |
| `GET /api/anime` | 公开 | 获取全部番剧数据 |
| `POST /api/anime` | 需登录 | 新增番剧 |
| `PUT /api/anime/[id]` | 需登录 | 更新番剧 |
| `DELETE /api/anime/[id]` | 需登录 | 删除番剧 |
| `POST /api/auth` | 公开 | 密码验证，设置 cookie |
| `DELETE /api/auth` | 公开 | 清除 cookie（登出） |

密码保护由 `proxy.ts` 实现（Next.js 16 的 middleware 新版叫法）。默认密码 `123456`，在 `.env.local` 中设置。

## 视觉风格

### 设计特点

- **Glassmorphism 轻盈风格**：白色背景图 + 半透明毛玻璃卡片
- **配色方案**：粉色 (#ec4899) + 蓝色 (#3b82f6) + 玫瑰色 (#f43f5e)
- **毛玻璃参数**：35% 透明度 + 10px 模糊 + 16px 圆角
- **文字颜色**：深灰色主文字 (#gray-900)，彩色强调元素
- **卡片高度**：统一最小高度 200px，底部信息对齐

### 关键样式类

```css
/* 主毛玻璃卡片 */
.glass {
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* 输入框 */
.glass-input {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
  border-radius: 12px;
}
```

详细配置请参考 THEME-CONFIG.md。

## 主要功能

### 首页功能

1. **实时计时器**
   - 显示"本站已运行 XX天 XX时 XX分 XX秒"
   - 从 2026-06-08 21:45:00 开始计数
   - 每秒自动更新，彩色数字显示

2. **组合筛选与可分享 URL**
   - 支持关键词、年份、季度、标签、最低评分与排序
   - 所有有效筛选使用 AND 语义，多个标签要求全部命中
   - URL 使用 `q`、`year`、`season`、`tag`、`rating`、`sort` 参数
   - 关键词延迟 250ms 更新 URL，其他条件立即更新且不触发网络请求

3. **档案统计与详情**
   - 显示总番剧数、年份跨度和季度数
   - 卡片详情面板展示完整短评与可选 Bangumi 信息

4. **年份/季度折叠**
   - 年份和季度均可展开/收起，最新年份默认展开
   - 年份、季度由新到旧排列，记录支持评分、标题或添加时间排序

### 管理页功能

1. **工作区信息架构**
   - 默认打开记录工作区；添加/编辑与备份恢复分别独立展示
   - 首次进入不读取备份，选择备份恢复后才挂载并请求历史版本
   - 保存或取消添加/编辑后返回记录工作区

2. **本地搜索栏**
   - 集成在记录工作区，实时过滤列表
   - 无结果时显示友好提示
   - 长列表使用页面自然滚动，不使用固定高度的内嵌滚动框

3. **标签管理**
   - 输入框 + 添加按钮，按回车快速添加
   - 每个标签有删除按钮
   - 粉色/蓝色渐变标签样式

4. **年份输入**
   - 数字输入框，范围 0-9999

5. **季度选择**
   - 春季-1月、夏季-4月、秋季-7月、冬季-10月

6. **评分滑块**
   - 范围：1.0-10.0，步长 0.5
   - 实时显示当前数值（粉色高亮）
   - 下方可视化星星预览

7. **备份恢复**
   - 独立工作区提供 JSON 导入导出、历史版本、差异预览与恢复

## 本地开发

```bash
npm run dev         # 启动开发服务器 (http://localhost:3000)
npm run build       # 构建生产版本
npm run start       # 启动生产服务器
```

**注意**：Turbopack 首次编译较慢（约 1 分钟），等看到 `✓ Ready` 再打开浏览器。

## 部署到 Vercel

1. 推送代码到 GitHub 仓库
2. 在 Vercel 导入该项目
3. 设置环境变量 `ADMIN_PASSWORD`
4. （可选）在 Vercel Marketplace 添加 Upstash Redis 集成，自动设置 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`
5. 如果不配置 Redis，数据存于 JSON 文件，每次部署后重置

## 架构注意事项

- `proxy.ts` 是 Next.js 16 的 middleware 新名称（旧版叫 `middleware.ts`）
- `app/page.tsx` 是 Server Component，每次渲染只调用一次 `storage.getAll()`；存储失败渲染错误状态
- `app/layout.tsx` 与 `components/site-header.tsx` 均保持服务端渲染，不再维护全局番剧搜索 Context
- `components/archive/archive-browser.tsx` 只管理公开浏览交互，所有数据由服务端页面作为 props 注入
- `app/admin/page.tsx` 只维护局部 `AdminSection` 状态；三个后台工作区互斥挂载，不引入全局状态库
- `components/backup-manager.tsx` 仅在备份恢复工作区挂载，因此后台首次加载不请求 `/api/backups`
- `lib/archive/filter.ts` 集中处理 URL 归一化、筛选、排序、分组和统计，且不修改调用方数组
- `GET /api/anime` 保持公开且响应兼容，但公开首页不调用该 API
- 评分使用 `Math.round(rating * 2) / 2` 取整到 0.5 步长
- 浏览器扩展"沉浸式翻译"会导致 hydration 警告，已在 `<html>` 加 `suppressHydrationWarning`
- `components/` 下大部分组件是 `"use client"`（含交互/动效）
- 封面图片使用 `<img>` 而非 `next/image`（外部 CDN URL 需额外配置）
- 卡片高度统一：最小高度 200px，评论区域固定 40px（两行），底部信息始终对齐

## 自定义配置

### 透明度调整

编辑 `app/globals.css` 中的 `.glass` 类：

```css
/* 更透明 */
background: rgba(255, 255, 255, 0.25);
backdrop-filter: blur(8px);

/* 平衡（当前） */
background: rgba(255, 255, 255, 0.35);
backdrop-filter: blur(10px);

/* 更实 */
background: rgba(255, 255, 255, 0.55);
backdrop-filter: blur(15px);
```

### 计时器起始时间

编辑 `components/timer.tsx` 中的 `startDate`：

```typescript
const startDate = new Date("2026-06-08T21:45:00").getTime();
// 修改为你想要的起始时间
```

---

Made with ❤️ | 2026
