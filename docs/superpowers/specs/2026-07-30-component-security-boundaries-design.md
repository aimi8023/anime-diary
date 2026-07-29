# 组件与安全边界设计

## 目标

在不改变公开读取、认证 Cookie、存储格式、备份格式和后台信息架构的前提下，统一番剧输入校验、API 错误、前端反馈状态、写接口同源保护与登录失败限流。

本阶段选择“显式共享边界层”：每个写接口在路由入口调用共享安全与校验函数，业务错误通过共享响应函数输出。安全行为可从路由代码直接看见，并能用单元测试逐条验证。

## 当前问题

- `POST /api/anime` 与 `PUT /api/anime/[id]` 分别实现输入清理，规则不一致。
- 非有限评分、非法话数或错误字段类型会被静默转换或进入存储，调用方无法知道输入有误。
- 同源校验只覆盖部分备份接口；登录、退出和番剧写接口缺少相同保护。
- 番剧、备份、Bangumi 与登录各自解析错误响应，非 JSON 错误会再次触发解析异常。
- 登录密码可以无限重试。
- 登录、表单、Bangumi 和备份的错误提示语义与样式重复。

## 总体架构

新增四个小边界：

1. `lib/anime/validation.ts`
   - 把未知 JSON 解析成规范化的新增或更新输入。
   - 返回结构化校验问题，不直接依赖 Next.js。
2. `lib/http/`
   - 服务端统一错误响应与严格同源判断。
   - 客户端安全读取错误消息。
3. `lib/auth/rate-limit.ts`
   - 提供登录失败计数接口。
   - 生产环境有 Redis 时使用 Redis；其他情况使用进程内存。
4. `components/feedback/inline-feedback.tsx`
   - 统一错误与成功提示的可访问语义。

路由仍负责协调存储和业务服务，不新增全局状态库，不引入第三方依赖。

## 番剧输入校验

### 接口

```ts
type InputIssue = {
  path: string;
  message: string;
};

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: InputIssue[] };

function parseAnimeCreateInput(value: unknown): ValidationResult<AnimeInput>;
function parseAnimeUpdateInput(
  value: unknown,
): ValidationResult<Partial<AnimeInput>>;
```

### 规则

- 请求体必须是非数组对象；无效 JSON 单独返回 `invalid_json`。
- 新增必须提供 `title` 与 `season`；更新至少包含一个受支持字段。
- `title`：去除首尾空白，长度 1–120。
- `season`：去除首尾空白，长度 1–20，保留现有自定义季度兼容性。
- `cover`、`bangumiUrl`：允许空值；非空时必须是 `http` 或 `https` URL，最长 2048。
- `rating`：有限数字、范围 1–10，并且是 0.5 的倍数。
- `comment`：字符串，去除首尾空白，最长 2000。
- `episodes`：0–9999 的整数。
- `tags`：最多 20 个字符串；逐项去除空白，每项 1–30 字符，并按首次出现去重。
- `bangumiId`：可选正整数。
- `originalTitle`：可选字符串，去除首尾空白，最长 120。
- `airDate`：可选有效 `YYYY-MM-DD` 日期。
- 未知字段忽略，`createdAt` 与 `id` 继续由服务端生成。
- 可选元数据传入空字符串时规范化为 `undefined`，用于清除已有值。

校验失败统一返回：

```json
{
  "error": "提交的数据不符合要求",
  "code": "invalid_input",
  "issues": [{ "path": "rating", "message": "评分必须是 1–10 之间的 0.5 倍数" }]
}
```

## API 错误边界

### 响应格式

所有本阶段涉及的错误响应使用兼容格式：

```ts
interface ApiErrorBody<TIssue = unknown> {
  error: string;
  code?: string;
  issues?: TIssue[];
  existingId?: string;
}
```

现有客户端依赖的 `error` 与重复记录的 `existingId` 保持不变，只补充稳定 `code`。

共享错误码包括：

- `invalid_origin`
- `invalid_json`
- `invalid_input`
- `rate_limited`
- `duplicate_bangumi`
- `revision_conflict`
- 现有备份领域错误码

服务端未知异常记录详细日志，但只向客户端返回操作级消息。客户端 `readApiError(response, fallback)` 先检查 JSON，再安全回退到默认消息；HTML、空响应或错误 JSON 不会覆盖原始操作错误。

## 同源保护

`requireSameOrigin(request)` 严格要求：

- 请求包含 `Origin`。
- `Origin` 解析后的源与 `new URL(request.url).origin` 完全一致。
- 缺失、`null`、无法解析或外域来源均返回 `403 invalid_origin`。

覆盖以下接口：

- `POST /api/auth`
- `DELETE /api/auth`
- `POST /api/anime`
- `PUT /api/anime/[id]`
- `DELETE /api/anime/[id]`
- `POST /api/backups/import/preview`
- `POST /api/backups/import/apply`
- `POST /api/backups/[id]/restore`

`proxy.ts` 继续负责认证和路由保护；路由内同源检查负责 CSRF 边界，两者职责不合并。

## 登录失败限流

### 策略

- 标识：客户端 IP。优先读取 `x-forwarded-for` 的第一项，其次 `x-real-ip`，最后使用 `unknown`。
- Redis 键只保存 IP 的 SHA-256 摘要片段，不保存明文 IP。
- 窗口：15 分钟。
- 阈值：同一标识连续失败 5 次。
- 第 5 次失败仍返回 `401`；之后在窗口结束前返回 `429 rate_limited`。
- `429` 响应包含 `Retry-After` 秒数。
- 成功登录立即清除该标识的失败记录。
- 服务器未配置 `ADMIN_PASSWORD` 时返回 `500`，不累计失败次数。
- 无效 JSON、非字符串密码和错误密码都视为失败尝试。

### 存储

- 检测到现有 Redis 环境变量时，使用 `@upstash/redis` 和原子 Lua 操作记录次数与过期时间。
- 本地开发或未配置 Redis 时，使用模块级内存 Map，并在访问时清理过期条目。
- 不新增环境变量或依赖。
- 内存回退只保证单实例限流；README 明确生产环境应配置现有 Redis。

## 前端反馈组件

`InlineFeedback` 接收：

```ts
interface InlineFeedbackProps {
  tone: "error" | "success";
  children: React.ReactNode;
  className?: string;
}
```

- `error` 使用 `role="alert"`。
- `success` 使用 `role="status"`。
- 组件只统一语义与基础容器样式，不在本阶段建立完整视觉令牌。
- 登录、`AnimeForm`、`BangumiSearch` 和 `BackupManager` 复用该组件。
- 删除失败不再使用阻塞式 `alert()`，由管理页显示行内错误。

## 数据流

### 番剧写入

1. 路由验证同源。
2. 安全读取 JSON。
3. 共享校验器返回规范化数据或结构化问题。
4. 路由调用存储。
5. 领域冲突映射为稳定错误码。
6. 前端通过共享解析器显示行内反馈。

### 登录

1. 路由验证同源。
2. 读取客户端标识并检查是否已受限。
3. 安全读取密码。
4. 失败时累计次数；成功时清除计数并设置现有 Cookie。
5. 受限时返回 `429` 与 `Retry-After`，登录页显示服务端消息。

## 测试策略

- 校验器纯函数测试：正常规范化、错误类型、边界值、更新空对象与可选字段清除。
- 同源纯函数测试：同源、外域、缺失、无效与 `null` Origin。
- 番剧路由测试：在已有成功与领域冲突用例上补 Origin，并验证校验失败不会调用存储。
- 认证路由测试：失败累计、阈值后 `429`、`Retry-After`、成功清除、Redis/内存适配器契约。
- 备份路由回归：继续验证严格同源。
- 客户端错误读取测试：JSON、非 JSON、空响应。
- 反馈组件与管理页测试：可访问角色、删除错误行内展示。
- 最终运行全部测试、TypeScript、ESLint 与生产构建。

## 不在本阶段

- 不更换密码认证方案或 Cookie 格式。
- 不增加账号系统、验证码、双因素认证或密码重置。
- 不为公开读取接口限流。
- 不迁移存储格式或备份格式。
- 不建立完整视觉设计系统；视觉精修仍属于下一阶段。

## 验收标准

- 所有列出的写接口拒绝非同源或缺失 Origin，且返回相同错误结构。
- 番剧新增与更新只使用共享校验器，非法输入不会进入存储。
- API 消费组件能处理 JSON 与非 JSON 错误，并显示一致的行内状态。
- 同一 IP 在 15 分钟内失败 5 次后受到限制，成功登录会清除计数。
- Redis 可用时限流跨实例共享；无 Redis 时本地开发正常工作。
- 现有公开读取、Bangumi 预填、CRUD、备份导入恢复和认证 Cookie 行为保持可用。
