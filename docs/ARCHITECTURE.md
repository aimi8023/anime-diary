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

### 搜索与筛选入口

搜索是首页内联区域，不使用弹窗或抽屉：

- `ArchiveSearchBar` 位于身份条与工具栏之间，包含关键词输入框，以及年份下拉、季度快切、评分下拉和标记快切行；
- 关键词输入经 `ArchiveBrowser` 的 250ms 防抖直接驱动筛选，没有“搜索”按钮，也不需要点击提交；其余筛选即时生效；
- 输入框右侧提供清除按钮，浏览器原生清除按钮由 `globals.css` 隐藏；
- 年份与评分用 `<select>`（选项随数据动态生成），季度只有 5 个取值，用单击快切按钮；
- 筛选结果通过 `window.history.replaceState` 同步到 URL，不触发服务端重新渲染；
- `SiteHeader` 只从 URL 计算活动条件数量并显示“筛选中 N”，不再持有搜索开关状态。

筛选维度：关键词、年份、季度、最低评分和标记。标签不参与筛选，也不参与关键词匹配。

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
├── site-header.tsx                  导航与“筛选中 N”提示
├── archive/                         公开筛选、分组、卡片、详情
│   └── archive-search-bar.tsx       首页内联搜索区（关键词/年份/季度/评分）
├── admin/admin-section-nav.tsx      后台工作区导航
├── anime-form.tsx                   新增/编辑表单
├── anime-list.tsx                   管理记录列表
├── bangumi-search.tsx               Bangumi 搜索与预填交互
├── backup-manager.tsx               备份、导入、导出与恢复
└── feedback/inline-feedback.tsx     统一行内反馈

lib/
├── anime/validation.ts              番剧输入唯一校验入口
│   └── marks.ts                     内置标记词表（多选、按作品筛选）
├── archive/                         URL、筛选、排序、分组与统计
│   └── works.ts                     作品聚合（series 分组、标记并集、均分）
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

scripts/                             本地批量入库工具（不入运行时）
├── year-gallery.mjs                 按年抓 Bangumi 四季候选
├── season-gallery.mjs               按季度抓放送列表
├── add-anime.mjs                    按 picks.json 写入 data/anime.json
├── update-anime.mjs                 按 updates.json 补评分/感想
├── sync-merge.mjs                   拉云端并合并本地新增，生成导入文件
├── match-bangumi.mjs                标题与 Bangumi 条目匹配
├── apply-bangumi-match.mjs          落库匹配结果
├── fetch-season.mjs / season-notable.mjs   单季度辅助工具
└── *.html / *.json                  一次性中间产物，已被 .gitignore 忽略
```

## 本地批量入库流程

管理后台的季度批量入库适合一次补一个季度；当初 276 条存量记录是走 `scripts/` 的离线流程灌进去的。该流程只用于管理员本人维护数据，不参与线上运行：

```text
node scripts/year-gallery.mjs 2023      # 抓全年候选 → year-2023-map.json
                                     # 人工挑片，写 picks.json（rating 先留 0）
node scripts/add-anime.mjs scripts/picks.json
                                     # 拉条目详情写入 data/anime.json
                                     # 之后写 updates.json（评分 + 感想）
node scripts/update-anime.mjs scripts/updates.json
node scripts/sync-merge.mjs            # 拉云端 → 合并本地新增
                                     # 生成 scripts/import-to-prod.json
                                     # 再到 /admin 备份恢复手动导入
```

必须遵守的约束：

- **生产数据在 Redis，本地 `data/anime.json` 只是暂存与镜像。** 脚本默认读取线上站点，因此配了 `KV_REST_API_*` 的本地开发环境同样看到云端数据，改本地 JSON 不会立刻反映在 `npm run dev` 里；
- `sync-merge.mjs` 是**云端优先**合并：已在云端的记录一律以云端为准，本地只贡献“云端没有的新增”。所以补评分必须在同步上云之前完成，否则会被下一次的同步覆盖；
- 导入前必须确认预览里的**删除数为 0**，非 0 立即停手；
- 脚本的字段映射和校验分别对齐 `lib/bangumi/mapper.ts` 与 `lib/anime/validation.ts`，规则变更时两边要同步；
- 所有抓取页、匹配报告和档案副本都是一次性的中间产物，已在 `.gitignore` 中排除，不要提交。

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
  marks?: string[];
  bangumiId?: number;
  bangumiUrl?: string;
  originalTitle?: string;
  airDate?: string;
  createdAt: string;
}
```

`lib/anime/marks.ts` 是内置标记的唯一来源，与自由文本的 `tags` 区别在于取值封闭、可多选、可按单个标记筛选：

| id | 显示 | 含义 |
|---|---|---|
| `rewatch` | 多刷 | 看过不止一遍 |
| `source` | 追原作 | 先追了小说、漫画、游戏或真人版原作 |
| `sequel` | 等续作 | 还没出续作，等着看 |

标记 id 一旦有记录在用就不能改名，否则旧数据会失去含义；需要调整语义时新增 id 并迁移，旧 id 保留到没有记录引用为止。展示层用 `toDisplayMarks` 兜底：词表里已不存在的标记不会被丢弃，仍按原始 id 显示。

### 作品与条目的分层

同一部作品会因分季、上下半、剧场版被拆成多条记录。季度归档需要它们各自独立的播出时间，但标记和「作品」分类需要把它们视为同一部——这两个需求挤在同一条记录上会互相破坏，因此引入 `series` 字段分层：

- **每个番都是作品**，区别只在于它是一条（单作）还是多条归集在一起（作品）；
- **`series` 相同即为同一部作品；没有 `series` 的记录自己就是一部完整作品。** 存量数据不做迁移也能正常工作，只有需要归集时才写 `series`；
- 顶层分类 `scope`：`solo` 只保留没有 `series` 的条目（默认），`work` 只保留带 `series` 的条目并按作品集聚合。**`work` 不按条目数过滤**——刚归进作品集、还没有同作品兄弟的记录也要能看到，否则它会在两个分类里都消失；
- `lib/archive/works.ts` 是聚合逻辑的唯一来源：分组键、条目按档期排序、标记并集、最高分与最新档期；
- **所有条件都按作品层生效**：作品里任意条目命中，整部作品都保留，因此 `filterAnimeByWorks` 与 `countArchiveScopes` 都必须拿到全量数据；
- 作品的**评分取各条目最高分**（记住最好的一次），**时间取最新档期**（代表最新播出状态），封面也取最新那条；排列按季度时用最新档期、按评分时用最高分；
- 分类快切上的两个计数必须在分类收敛**之前**统计，否则停在「单作」时「作品」计数会恒为 0；
- 后台添加/编辑表单提供作品集输入并带已有作品集候选；列表行回显「作品集：XXX」便于核对；
- 快速补评分/打标记对话框接收同作品的 `siblings`，保存时把标记同步到其余条目，但只改标记，不动它们各自的评分与感想。

存量归并由 `scripts/series-suggest.mjs` 生成候选（抹平标点后剥掉季度/篇章标记再比对），人工确认后 `scripts/apply-series.mjs` 写入。规则刻意保守：宁可漏掉剧场版系列等不规则标题，也不要错误归并。

`lib/anime/validation.ts` 是创建和更新记录的唯一输入规范化入口：

- `title` 去除首尾空白并限制长度；
- `season` 存储格式为 `YYYY` 加春/夏/秋/冬（如 `2024春`），年份分组、表单预填与归档展示都依赖该格式；展示层统一通过 `lib/season-label.ts` 转换为“1月/4月/7月/10月”档期表述；
- `rating` 必须为 0–10 之间的 0.5 倍数；`0` 是"未评分"哨兵值（批量入库的默认状态），展示层统一显示"未评分"，作品聚合的评分口径排除该值；`lib/backups/validation.ts` 镜像同一规则，导入备份同样接受 0；
- `episodes` 必须为 0–9999 的整数；
- 最多 20 个标签，每个标签 1–30 个字符，并去重；
- `marks` 只接受内置标记 id，去重后按内置顺序排列；未提供时创建默认为空数组；
- 封面和 Bangumi 地址只允许 HTTP(S) URL；
- `airDate` 使用有效的 `YYYY-MM-DD` 日期；
- 创建和局部更新使用同一套规则，API 路由不得复制校验逻辑。

旧记录可能缺少后续新增字段。存储读取边界负责规范化兼容（`normalizeStoredData` 把缺失的 `marks` 补成空数组），展示组件仍应对空封面、空标签和可选元数据保持防御性。

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
- 搜索/列表缓存约 10 分钟，详情缓存约 1 小时，只是进程内性能优化；
- 请求超时为 8 秒；
- User-Agent 和可选 Token 只由服务端读取，Token 不进入浏览器或错误响应。
- 可选出站代理：配置 `BANGUMI_PROXY`（或标准 `HTTPS_PROXY`）后 Bangumi 请求改走该代理（undici ProxyAgent），用于直连超时的本地网络；未配置时保持直连，生产环境不受影响。

季度批量入库：`GET /api/bangumi/season?year=&season=`（管理员）按播出日期区间过滤、按热度排序拉取一季度放送列表；Bangumi 搜索单页上限 20 条，客户端分页拉取至多 144 部，缓存 10 分钟，重复检测装饰与搜索端点一致；管理端候选按每页 24 部翻页展示（翻页不重新请求），卡片显示压缩缩略图（`common`），勾选后逐部 `POST /api/anime` 入库并保存全尺寸封面（`large`），评分记 0（未评分），之后经记录工作区的快速补评分对话框补填评分与感想。

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

- 解析和规范化 `q`、`year`、`season`、`mark`、`rating`、`group`、`dir`；
- 兼容旧版 `sort`/`group=year` 参数并映射到季度维度；旧版 `tag` 参数被忽略；URL 中未知的 `mark` 取值被丢弃而不是报错；
- 将有效条件写回 URL；
- 关键词、年份、季度、标记和最低评分的 AND 筛选；多个标记取交集（选中的每一个都必须命中）；
- 顶层分类 `scope`：`solo`（默认，只有没有 `series` 的条目）与 `work`（按作品集聚合）；
- 排列维度：`season` 按播出档期分行（“2024年4月”…）、`rating` 按评分档分行（10.0、9.5…，不按档期分割）；
- 每个维度支持 `dir=asc/desc` 升降序；
- 活动筛选数量（排列偏好不计入）。

关键词只覆盖标题、原名和感想。纯函数不得修改调用方数组。标签仍保存在记录中并展示在详情层，但不再是筛选维度。

## UI 与视觉系统

### “水光档案”原则

- `public/bg.webp` 是氛围背景，不承担文字对比度；
- 内容使用稳定的瓷白表面；
- 樱粉用于主要动作，湖蓝用于信息，琥珀用于评分，红色只用于危险和错误；
- 公开卡片使用 2:3 海报比例，只显示封面、评分、季度、最多两个标记和标题；超出的标记折叠为 `+N`；
- 详情层完整列出全部标记，标签、感想和完整元数据同样只在详情层展示。

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

### 响应式与可访问性

- 公开海报网格按宽度使用 2/3/4/6/7 列；
- 搜索区在窄屏下控件换行，季度快切保持横向排列；
- 桌面详情约 960px 双栏，手机详情接近全屏；
- 对话框支持遮罩、关闭按钮和 Escape，并恢复背景滚动与触发元素焦点；
- 新控件的可操作区域至少 44×44px，纯展示标签除外；
- 状态不能只依赖颜色，必须有文字或图标；
- 全局 `prefers-reduced-motion` 缩短动画，Framer Motion 组件同时使用 `useReducedMotion()`；
- 外部封面使用 `next/image` 的 `unoptimized`、明确 `sizes` 和有尺寸的父容器。

## 维护不变量

修改项目时保持以下单一职责：

- 番剧输入规则只改 `lib/anime/validation.ts`，备份导入镜像规则只改 `lib/backups/validation.ts`，两者同步放开；
- 内置标记词表只改 `lib/anime/marks.ts`，校验、筛选、后台表单和公开展示都从那里读取；
- `scripts/` 只用于管理员维护数据，不得被任何页面、接口或构建步骤引用；
- 公开筛选、URL、分组和统计只改 `lib/archive/`；
- API 错误和同源规则只改 `lib/http/`；
- 登录限流只改 `lib/auth/rate-limit.ts`；
- 备份格式、校验、差异和流程只改 `lib/backups/`；
- JSON/Redis 差异封装在存储适配器，不泄露给页面组件；
- 视觉令牌只在 `app/globals.css` 定义，组件消费语义类；
- 筛选态只由 `ArchiveBrowser` 持有，导航栏只读 URL，不复制筛选状态；
- 管理写接口同时需要认证和同源检查；
- 新外部服务不得成为公开首页读取记录的运行时依赖。

## 部署与配置

源码推送到 GitHub `main` 后由 Vercel 自动部署。生产环境至少配置：

- `ADMIN_PASSWORD`；
- 一组可用的 Upstash/KV Redis URL 与 Token；
- 可识别项目所有者的 `BANGUMI_USER_AGENT`；
- 可选 `BANGUMI_ACCESS_TOKEN`。

私密变量只保存在 `.env.local` 或 Vercel 环境变量中。具体提交与部署步骤见项目根目录 [README.md](../README.md)。
