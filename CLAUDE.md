# Anime Diary — 追番日记

一个个人追番记录网站，按季度记录和浏览追过的番剧。支持公网访问，管理功能密码保护。

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
├── proxy.ts                     ← 路由守卫（密码保护 middleware）
├── .env.local                   ← ADMIN_PASSWORD=123456
├── lib/
│   ├── types.ts                 ← Anime 数据模型
│   ├── storage.ts               ← Storage 接口
│   ├── storage-json.ts          ← JSON 文件存储实现
│   ├── storage-kv.ts            ← Upstash Redis 存储实现
│   └── storage-factory.ts       ← 根据环境自动选择存储
├── app/
│   ├── layout.tsx               ← 全局布局（玻璃态 Header/Footer）
│   ├── page.tsx                 ← 首页（按季度分组的番剧卡片）
│   ├── globals.css              ← 玻璃态主题 + 星空背景
│   ├── login/page.tsx           ← 登录页
│   ├── admin/page.tsx           ← 管理页（增删改番剧）
│   └── api/
│       ├── auth/route.ts        ← 登录/登出 API
│       └── anime/
│           ├── route.ts         ← GET 全部 / POST 新增
│           └── [id]/route.ts    ← PUT 更新 / DELETE 删除
├── components/
│   ├── anime-card.tsx           ← 番剧卡片（毛玻璃动效）
│   ├── season-section.tsx       ← 季度区块（可折叠）
│   ├── star-rating.tsx          ← 星星评分（支持 0.5 步长）
│   ├── status-badge.tsx         ← 状态标签
│   ├── anime-form.tsx           ← 番剧表单（添加/编辑）
│   └── anime-list.tsx           ← 管理列表
├── data/anime.json              ← 示例数据（本地开发用）
└── public/                      ← 静态资源
```

## 数据模型

```typescript
interface Anime {
  id: string;         // nanoid(12)
  title: string;      // 番剧标题
  season: string;     // 如 "2024秋"、"2024冬"
  cover: string;      // 封面图片 URL
  rating: number;     // 1.0-10.0，步长 0.5
  status: "想看" | "在看" | "看完" | "弃番";
  comment: string;    // 短评
  episodes: number;   // 总话数
  createdAt: string;  // ISO 时间戳
}
```

## 路由与权限

| 路由 | 权限 | 说明 |
|------|------|------|
| `/` | 公开 | 首页，按季度浏览，评分倒序 |
| `/login` | 公开 | 密码登录页 |
| `/admin` | 需登录 | 管理页，增删改番剧 |
| `GET /api/anime` | 公开 | 获取全部番剧数据 |
| `POST /api/anime` | 需登录 | 新增番剧 |
| `PUT /api/anime/[id]` | 需登录 | 更新番剧 |
| `DELETE /api/anime/[id]` | 需登录 | 删除番剧 |
| `POST /api/auth` | 公开 | 密码验证，设置 cookie |
| `DELETE /api/auth` | 公开 | 清除 cookie（登出） |

密码保护由 `proxy.ts` 实现（Next.js 16 的 middleware 新版叫法）。默认密码 `123456`，在 `.env.local` 中设置。

## 视觉风格

- **Glassmorphism 二次元风格**：深紫蓝星空渐变背景 + CSS 粒子动画
- 毛玻璃卡片：`bg-white/[0.06] backdrop-blur border-white/10`
- 悬停：上浮 + 光晕 + 缩放
- 评分：粉金色星星（支持半星显示）
- 季度区块可折叠，点击标题展开/收起
- 响应式：手机 2 列 → 平板 3 列 → 桌面 5-6 列

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

## 注意事项

- `proxy.ts` 是 Next.js 16 的 middleware 新名称（旧版叫 `middleware.ts`）
- `app/page.tsx` 有 `export const dynamic = "force-dynamic"` 确保数据实时
- 评分使用 `Math.round(rating * 2) / 2` 取整到 0.5 步长
- 浏览器扩展"沉浸式翻译"会导致 hydration 警告，已在 `<html>` 加 `suppressHydrationWarning`
- `components/` 下大部分组件是 `"use client"`（含交互/动效）
