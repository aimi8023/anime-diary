# Anime Diary 系统架构

本文是当前系统的技术事实来源。它描述现有边界和维护约束，不记录已经完成的逐步实施过程；历史演进见 [DEVELOPMENT-HISTORY.md](./DEVELOPMENT-HISTORY.md)。

## 系统定位

Anime Diary 是单一管理员维护、公开只读展示的个人追番档案：

- 公开用户可以浏览、搜索和回顾记录；
- 管理员通过密码登录后管理记录和备份；
- Bangumi 只用于录入时搜索和预填，不是本站运行时的数据源；
- 本站数据保存后形成独立快照，不与 Bangumi 双向同步；
- 当前不包含多人账户、社交互动或独立作品详情路由。

## 技术栈

| 层 | 实现 |
|---|---|
| Web 框架 | Next.js 16 App Router、React 19、TypeScript |
| 样式 | Tailwind CSS 4、`app/globals.css` 语义令牌 |
| 动效 | Framer Motion |
| 本地存储 | `data/anime.json` 与 `data/backups/` |
| 生产存储 | Upstash Redis |
| 测试 | Vitest、Testing Library、jsdom |
| 部署 | GitHub `main` → Vercel 自动部署 |

## 运行时边界

### 公开首页

`app/page.tsx` 是 Server Component。每次页面渲染只调用一次 `storage.getAll()`，然后把记录和统计结果传给客户端 `ArchiveBrowser`。存储失败时渲染明确的可重试错误状态，不把异常伪装成空档案。

`ArchiveBrowser` 只负责浏览器内交互：

- 保存筛选和排序状态；
- 使用 `lib/archive/filter.ts` 计算结果；
- 把条件序列化到 URL；
- 响应浏览器前进、后退；
- 管理当前打开的详情记录。

筛选不会重新请求全部记录。`GET /api/anime` 为兼容用途保持公开，但首页不依赖它。

### 全局搜索入口

`ArchiveSearchProvider` 位于根布局，只保存搜索层的打开/关闭状态，不保存番剧数据或筛选条件。

- `SiteHeader` 打开搜索层并从 URL 计算活动条件数量；
- `ArchiveSearchPanel` 接收 `ArchiveBrowser` 的筛选状态和回调；
- 桌面端使用居中浮层，手机端使用底部抽屉；
- 搜索打开后聚焦关键词，关闭时恢复焦点和页面滚动；
- 依赖 `useSearchParams()` 的导航徽标子树放在 `Suspense` 中，保证静态错误页可构建。

### 管理后台

`app/admin/page.tsx` 维护三个互斥工作区：

1. 记录；
2. 添加/编辑；
3. 备份恢复。

后台首次进入只读取番剧数据。`BackupManager` 仅在进入备份工作区后挂载，因此不会在日常记录维护时提前请求备份列表。保存或取消表单后返回记录工作区。

## 主要目录和职责

```text
app/
├── page.tsx                         公开首页服务端数据入口
├── layout.tsx                       全局布局与搜索状态边界
├── login/page.tsx                   管理员登录
├── admin/page.tsx                   管理后台工作区
└── api/                             认证、番剧、Bangumi、备份接口

components/
├── site-header.tsx                  导航、搜索入口、筛选徽标
├── archive/                         公开筛选、分组、卡片、详情
├── admin/admin-section-nav.tsx      后台工作区导航
├── anime-form.tsx                   新增/编辑表单
├── anime-list.tsx                   管理记录列表
├── bangumi-search.tsx               Bangumi 搜索与预填交互
├── backup-manager.tsx               备份、导入、导出与恢复
└── feedback/inline-feedback.tsx     统一行内反馈

lib/
├── anime/validation.ts              番剧输入唯一校验入口
├── archive/                         URL、筛选、排序、分组与统计
├── auth/rate-limit.ts               Redis/内存登录限流
├── backups/                         备份格式、校验、差异和服务
├── bangumi/                         第三方客户端、类型和映射
├── http/                            错误响应、客户端读取、同源保护
├── storage-core.ts                  版本化变更核心
├── storage-json.ts                  本地 JSON 适配器
├── storage-kv.ts                    Redis 适配器
└── storage-factory.ts               按环境选择存储

proxy.ts                             页面和 API 认证边界
app/globals.css                      视觉令牌与共享语义类
```

## 数据模型与校验

```ts
interface Anime {
  id: string;
  title: string;
  season: string;
  cover: string;
  rating: number;
  comment: string;
  episodes: number;
  tags: string[];
  bangumiId?: number;
  bangumiUrl?: string;
  originalTitle?: string;
  airDate?: string;
  createdAt: string;
}
```

`lib/anime/validation.ts` 是创建和更新记录的唯一输入规范化入口：

- `title` 去除首尾空白并限制长度；
- `season` 必须是 `YYYY` 加春/夏/秋/冬（如 `2024春`），年份分组、表单预填与归档展示都依赖该格式；
- `rating` 必须为 1–10 之间的 0.5 倍数；
- `episodes` 必须为 0–9999 的整数；
- 最多 20 个标签，每个标签 1–30 个字符，并去重；
- 封面和 Bangumi 地址只允许 HTTP(S) URL；
- `airDate` 使用有效的 `YYYY-MM-DD` 日期；
- 创建和局部更新使用同一套规则，API 路由不得复制校验逻辑。

旧记录可能缺少后续新增字段。存储读取边界负责规范化兼容，展示组件仍应对空封面、空标签和可选元数据保持防御性。

## 存储架构

`lib/storage-factory.ts` 按环境变量选择实现：

- 有 Redis URL 和 Token：使用 `storage-kv.ts`；
- 否则：使用 `storage-json.ts`。

兼容的变量名包括：

- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`；
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`；
- `REDIS_URL` 与兼容 Token 配置。

所有调用方依赖 `Storage` 接口，不直接判断当前存储实现。

### 版本化状态

当前权威状态为：

```ts
interface AnimeState {
  revision: number;
  data: Anime[];
}
```

变更通过 `expectedRevision` 执行乐观并发控制，并在替换当前状态前写入旧数据快照。Redis 使用条件脚本原子完成版本检查、快照和新状态写入；本地 JSON 适配器提供相同行为契约。

Redis 键：

- `anime:state`：当前版本化状态；
- `anime:all`：旧数组格式，仅用于兼容迁移；
- `anime:backups`：快照时间索引；
- `anime:backup:metadata`：快照元数据；
- `anime:backup:{id}`：完整快照。

## 备份与恢复

快照原因包括 `add`、`update`、`delete`、`import` 和 `restore`。默认保留最近 30 个版本。

关键行为：

- 添加、编辑、删除、导入和恢复前保存当前数据；
- 恢复某个版本前仍会备份当前状态，因此恢复操作可撤回；
- 导入前计算新增、移除、修改和未变化数量；
- 支持旧版纯数组和新版 `anime-diary-backup` 文件；
- 导入文件上限 5 MB；
- 空数据导入需要额外确认；
- 导出文件不包含密码、Cookie、Redis/Bangumi 凭据或环境变量；
- 存储损坏或不可用必须返回错误，不能降级为空数组。

站内快照与当前数据默认处于同一存储系统，只能防止误操作。站外副本是未来可扩展能力，当前最简单的方式是定期下载 JSON。

## Bangumi 辅助录入

数据流：

1. 管理员输入中日文标题；
2. 浏览器请求受保护的 `/api/bangumi/search`；
3. 服务端调用 Bangumi 搜索 API，最多返回 8 个动画条目；
4. 管理员选择条目后请求 `/api/bangumi/subjects/:id`；
5. 服务端映射标题、原名、封面、首播日、季度、话数和最多 12 个候选标签；
6. 管理员选择标签、修改个人评分和感想后保存为本站记录。

重要约束：

- Bangumi 社区评分不会映射为个人评分；
- 候选标签不会自动全部保存；
- `bangumiId` 用于精确重复检测，重复创建返回冲突；
- 保存后公开页面只读取本站数据，不实时依赖 Bangumi；
- 搜索缓存约 5 分钟，详情缓存约 1 小时，只是进程内性能优化；
- 请求超时为 8 秒；
- User-Agent 和可选 Token 只由服务端读取，Token 不进入浏览器或错误响应。

## 路由、认证与安全

### 权限

| 路径 | 权限 |
|---|---|
| `/`、`/login`、`GET /api/anime` | 公开 |
| `/admin` | 已认证管理员 |
| `/api/anime` 非 GET | 已认证管理员 |
| `/api/bangumi/*` | 已认证管理员 |
| `/api/backups/*` | 已认证管理员 |

`proxy.ts` 负责上述粗粒度认证边界。没有配置 `ADMIN_PASSWORD` 时，管理页面和写接口直接拒绝访问，不允许以无密码模式运行后台。

登录成功后设置 `admin_token`：它是管理员密码的 SHA-256 摘要，Cookie 使用 HttpOnly、SameSite=Lax 和站点路径约束。它适合本项目的单管理员密码方案，但不是通用账户系统。

### 同源写保护

所有会改变状态的接口显式调用 `sameOriginError()`，要求请求 `Origin` 与目标 URL 完全同源。认证 Cookie 与同源检查共同构成写入边界；不能只依赖 `proxy.ts`。

### 登录限流

- 同一客户端 15 分钟内失败 5 次后暂时限制；
- 成功登录清除失败计数；
- 配置 Redis 时多实例共享计数，否则使用单进程内存；
- Redis 键只包含客户端标识的 SHA-256 摘要，不存明文 IP；
- 限流或内部错误不记录连接凭据和敏感细节。

### 错误边界

`lib/http/response.ts` 统一 API 错误结构：

```ts
{ error: string, code?: string, issues?: InputIssue[], existingId?: string }
```

客户端通过 `lib/http/client.ts` 读取安全错误，界面使用 `InlineFeedback` 展示可访问的行内提示。服务端不得把 Redis 键、文件绝对路径、Token、脚本或完整第三方响应返回给浏览器。

## 公开档案与筛选规则

`lib/archive/filter.ts` 集中负责：

- 解析和规范化 `q`、`year`、`season`、`tag`、`rating`、`sort`；
- 将有效条件写回 URL；
- 关键词、年份、季度、标签和最低评分的 AND 筛选；
- 评分、标题或添加时间排序；
- 年份/季度分组和统计；
- `getYearlyRecap` 年度回顾聚合（部数、平均分、年度之作、高频标签）；
- 活动筛选数量。

关键词覆盖标题、原名、感想和标签。多个标签要求记录同时包含全部标签。纯函数不得修改调用方数组。

## UI 与视觉系统

### “水光档案”原则

- `public/bg.webp` 是氛围背景，不承担文字对比度；
- 内容使用稳定的瓷白表面；
- 樱粉用于主要动作，湖蓝用于信息，琥珀用于评分，红色只用于危险和错误；
- 公开卡片使用 2:3 海报比例，只显示封面、评分、季度和标题；
- 标签、感想和完整元数据进入详情层。

### 令牌

视觉来源集中在 `app/globals.css` 的 `:root`：

- 画布：`--canvas`、`--canvas-tint`、`--canvas-blue`；
- 表面：`--surface`、`--surface-strong`、`--surface-soft`、`--surface-border`；
- 文字：`--ink`、`--ink-muted`、`--ink-subtle`；
- 状态：`--accent*`、`--info*`、`--warning*`、`--danger*`；
- 阴影：`--shadow-sm`、`--shadow-md`、`--shadow-lg`；
- 形状：`--radius-sm`、`--radius-md`、`--radius-lg`、`--radius-pill`；
- 动效：`--duration-fast`、`--duration-normal`、`--ease-out`。

如果背景变亮或复杂，优先提高表面令牌的不透明度，不要逐个修改组件。

### 语义类

| 类名 | 用途 |
|---|---|
| `.ui-panel` | 普通内容面板 |
| `.ui-panel-strong` | 表单、工作区和错误状态 |
| `.ui-field` | 输入框、下拉框和文本域 |
| `.ui-button*` | 主要、辅助和危险文字按钮 |
| `.ui-icon-button` | 关闭、退出等图标按钮 |
| `.ui-chip*` | 标签和轻量选择 |
| `.ui-kicker` | 页面或分组的小型标识 |
| `.ui-focus` | 非标准控件的键盘焦点 |

`.glass` 和 `.glass-input` 仅为旧组件兼容别名，新代码不要扩展它们。

### 响应式与可访问性

- 公开海报网格按宽度使用 2/3/4/6/7 列；
- 桌面搜索为导航下方居中卡片，手机搜索为底部抽屉；
- 桌面详情约 960px 双栏，手机详情接近全屏；
- 对话框支持遮罩、关闭按钮和 Escape，并恢复背景滚动与触发元素焦点；
- 新控件的可操作区域至少 44×44px，纯展示标签除外；
- 状态不能只依赖颜色，必须有文字或图标；
- 全局 `prefers-reduced-motion` 缩短动画，Framer Motion 组件同时使用 `useReducedMotion()`；
- 外部封面使用 `next/image` 的 `unoptimized`、明确 `sizes` 和有尺寸的父容器。

## 维护不变量

修改项目时保持以下单一职责：

- 番剧输入规则只改 `lib/anime/validation.ts`；
- 公开筛选、URL、分组和统计只改 `lib/archive/`；
- API 错误和同源规则只改 `lib/http/`；
- 登录限流只改 `lib/auth/rate-limit.ts`；
- 备份格式、校验、差异和流程只改 `lib/backups/`；
- JSON/Redis 差异封装在存储适配器，不泄露给页面组件；
- 视觉令牌只在 `app/globals.css` 定义，组件消费语义类；
- `ArchiveSearchProvider` 只管理显示状态，不演变为全局数据仓库；
- 管理写接口同时需要认证和同源检查；
- 新外部服务不得成为公开首页读取记录的运行时依赖。

## 部署与配置

源码推送到 GitHub `main` 后由 Vercel 自动部署。生产环境至少配置：

- `ADMIN_PASSWORD`；
- 一组可用的 Upstash/KV Redis URL 与 Token；
- 可识别项目所有者的 `BANGUMI_USER_AGENT`；
- 可选 `BANGUMI_ACCESS_TOKEN`。

私密变量只保存在 `.env.local` 或 Vercel 环境变量中。具体提交与部署步骤见项目根目录 [README.md](../README.md)。
