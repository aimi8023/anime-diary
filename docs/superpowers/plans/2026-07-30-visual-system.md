# 水光档案视觉系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有业务流程的前提下，为公开档案、登录页和管理后台建立统一、可访问、响应式的“水光档案”视觉系统。

**Architecture:** 使用 `app/globals.css` 中的 CSS 变量和少量语义类作为视觉基础，继续由 Tailwind 负责布局与断点。各页面只消费语义类和明确的状态变体；公开档案、站点外壳、登录与后台分任务迁移，并通过现有 React Testing Library 测试保护交互。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、Framer Motion、Vitest、Testing Library、`next/image`

## Global Constraints

- 保留 `public/bg.png`，不生成或替换背景图。
- 不新增 UI 组件库、图标库、字体依赖或自定义响应式断点。
- 不修改档案筛选语义、管理工作流、数据模型、API、存储、认证、限流或备份规则。
- 所有交互目标至少 44×44px，纯展示标签除外。
- 所有动效遵守 `prefers-reduced-motion`。
- 外部封面继续通过 `next/image` 的 `unoptimized` 模式加载。
- 保持现有中文界面文案含义；允许为层级和可访问性做短句调整。

---

### Task 1: 全局令牌与站点外壳

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `components/site-header.tsx`
- Test: `components/site-header.test.tsx`

**Interfaces:**
- Consumes: 现有 Tailwind 4 和 `public/bg.png`。
- Produces: `.ui-panel`, `.ui-panel-strong`, `.ui-field`, `.ui-button*`, `.ui-icon-button`, `.ui-chip*`, `.ui-kicker`, `.ui-focus`，供后续任务使用。

- [x] **Step 1: 写失败测试，固定站点导航语义**

在 `components/site-header.test.tsx` 增加断言：

```tsx
expect(screen.getByRole("link", { name: "追番记录首页" })).toBeInTheDocument();
expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "管理后台" })).toBeInTheDocument();
```

- [x] **Step 2: 运行测试并确认失败**

Run: `npm test -- components/site-header.test.tsx`

Expected: FAIL，因为当前品牌链接名称是“追番记录”，管理链接名称是“管理”。

- [x] **Step 3: 实现视觉令牌、全局画布与 Header/Footer**

在 `app/globals.css` 根级定义设计令牌，新增语义类，并让旧 `.glass`/`.glass-input` 引用新令牌。静态色洗替代持续闪光动画，加入：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

更新 `SiteHeader` 的品牌、导航胶囊和可访问名称；更新 `app/layout.tsx` Footer 的表面、字级和间距。Header 高度保持 64px，供 sticky 筛选使用 `top-20`。

- [x] **Step 4: 运行聚焦测试、类型与 lint**

Run:

```powershell
npm test -- components/site-header.test.tsx
npx tsc --noEmit
npm run lint
```

Expected: 测试与类型通过；lint 不新增警告。

- [x] **Step 5: 提交**

```powershell
git add app/globals.css app/layout.tsx components/site-header.tsx components/site-header.test.tsx
git commit -m "style: establish waterlight visual tokens"
```

---

### Task 2: 公开档案浏览视觉

**Files:**
- Modify: `components/archive/archive-browser.tsx`
- Modify: `components/archive/archive-hero.tsx`
- Modify: `components/archive/archive-toolbar.tsx`
- Modify: `components/archive/active-filters.tsx`
- Modify: `components/archive/archive-results.tsx`
- Modify: `components/archive/year-section.tsx`
- Modify: `components/archive/archive-anime-card.tsx`
- Modify: `components/archive/archive-load-error.tsx`
- Test: `components/archive/archive-browser.test.tsx`
- Test: `components/archive/archive-results.test.tsx`

**Interfaces:**
- Consumes: Task 1 的语义视觉类；现有 `ArchiveFilters`, `ArchiveOptions`, `ArchiveStats`。
- Produces: 左对齐 Hero、统一筛选工具栏、2:3 海报卡片、清晰年份/季度层级和统一空/错误状态。

- [x] **Step 1: 写失败测试，固定海报与筛选结构**

在现有公开档案测试中增加：

```tsx
expect(screen.getByRole("search", { name: "档案筛选" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /查看《.*》详情/ }))
  .toBeInTheDocument();
```

筛选容器从 `section aria-label` 改成 `search aria-label`；测试数据至少渲染一张可打开详情的卡片。海报比例属于视觉决策，由浏览器验收，不用脆弱的 class 断言固定。

- [x] **Step 2: 运行测试并确认失败**

Run:

```powershell
npm test -- components/archive/archive-browser.test.tsx components/archive/archive-results.test.tsx
```

Expected: FAIL，因为当前筛选不是 `search` landmark。

- [x] **Step 3: 重构 Hero 与工具栏表现**

`ArchiveBrowser` 使用较宽但更稳定的内容内边距；`ArchiveHero` 在 `lg` 两栏排列标题与统计。`ArchiveToolbar` 使用 `.ui-panel-strong`、`top-20`、`.ui-field` 和 `.ui-chip`，桌面搜索占两列，移动抽屉支持点击遮罩关闭并保留“完成”按钮。

- [x] **Step 4: 重构结果层级与海报卡片**

`YearSection` 使用箭头 SVG 表示展开状态；季度数量使用徽标。`ArchiveAnimeCard`：

```tsx
<div className="relative aspect-[2/3] ..." data-testid="archive-poster">
  <Image fill unoptimized ... />
</div>
```

评分放到封面角标，卡片按钮添加 `archive-poster-card ui-focus`；正文按标题、季度、标签、短评排列。空结果和加载错误改用 `.ui-panel-strong` 与 `.ui-button-primary`。

- [x] **Step 5: 运行公开档案测试**

Run:

```powershell
npm test -- components/archive
npm test -- app/page.test.tsx
```

Expected: 全部 PASS。

- [x] **Step 6: 提交**

```powershell
git add components/archive app/page.test.tsx
git commit -m "style: refine public archive browsing"
```

---

### Task 3: 详情抽屉的层级与滚动边界

**Files:**
- Modify: `components/archive/anime-detail-dialog.tsx`
- Test: `components/archive/anime-detail-dialog.test.tsx`

**Interfaces:**
- Consumes: 现有 `AnimeDetailDialogProps` 和 Task 1 按钮/表面类。
- Produces: 打开期间锁定背景滚动、关闭后恢复原值的详情抽屉。

- [x] **Step 1: 写失败测试，固定滚动锁定和恢复**

增加测试：

```tsx
document.body.style.overflow = "clip";
const { rerender } = render(<AnimeDetailDialog anime={anime} onClose={onClose} />);
expect(document.body.style.overflow).toBe("hidden");
rerender(<AnimeDetailDialog anime={null} onClose={onClose} />);
expect(document.body.style.overflow).toBe("clip");
```

并断言关闭控件名称仍为“关闭详情”。

- [x] **Step 2: 运行测试并确认失败**

Run: `npm test -- components/archive/anime-detail-dialog.test.tsx`

Expected: FAIL，因为当前组件不修改 `document.body.style.overflow`。

- [x] **Step 3: 实现滚动锁定与视觉层级**

在现有 focus 恢复 effect 中保存 `document.body.style.overflow`，打开时设为 `hidden`，cleanup 时恢复。关闭按钮使用 `.ui-icon-button` 和 × 图形；元数据、标签与 Bangumi 外链迁移到语义表面/按钮类。遮罩与面板加入短促进入样式，不引入新状态。

- [x] **Step 4: 运行详情测试**

Run: `npm test -- components/archive/anime-detail-dialog.test.tsx`

Expected: 全部 PASS，且每个测试清理后 body overflow 恢复。

- [x] **Step 5: 提交**

```powershell
git add components/archive/anime-detail-dialog.tsx components/archive/anime-detail-dialog.test.tsx
git commit -m "style: polish archive detail drawer"
```

---

### Task 4: 登录与后台工作台

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `components/admin/admin-section-nav.tsx`
- Modify: `components/anime-list.tsx`
- Modify: `components/anime-form.tsx`
- Modify: `components/bangumi-search.tsx`
- Modify: `components/backup-manager.tsx`
- Modify: `components/feedback/inline-feedback.tsx`
- Test: `app/login/page.test.tsx`
- Test: `app/admin/page.test.tsx`
- Test: `components/admin/admin-section-nav.test.tsx`
- Test: `components/anime-list.test.tsx`
- Test: `components/anime-form.test.tsx`

**Interfaces:**
- Consumes: Task 1 视觉类和现有管理回调接口。
- Produces: 统一登录卡、后台外壳、分段导航、列表/表单/搜索/备份层级；管理封面全部使用 `next/image`。

- [x] **Step 1: 写失败测试，固定后台视觉语义和图片迁移**

更新/增加：

```tsx
expect(screen.getByRole("heading", { name: "欢迎回来" })).toBeInTheDocument();
expect(screen.getByRole("tablist", { name: "管理工作区" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "编辑《测试番剧》" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "删除《测试番剧》" })).toBeInTheDocument();
```

在 `components/anime-list.test.tsx` mock `next/image`，验证封面 `alt` 和动作名称；表单测试验证预览图片仍显示。

- [x] **Step 2: 运行测试并确认失败**

Run:

```powershell
npm test -- app/login/page.test.tsx app/admin/page.test.tsx components/admin/admin-section-nav.test.tsx components/anime-list.test.tsx components/anime-form.test.tsx
```

Expected: FAIL，因为当前登录标题、tablist 类和逐条动作可访问名称不匹配。

- [x] **Step 3: 实现登录页与后台框架**

登录页使用 `.ui-panel-strong`, `.ui-field`, `.ui-button-primary`，标题改为“欢迎回来”，说明明确为“输入密码进入追番管理后台”。入场动画距离缩短，使用 Framer Motion `useReducedMotion()` 在减少动态时禁用位移。

后台页统一 Header、退出图标按钮、分段导航和三个工作区强表面。记录工具行在桌面横排、移动堆叠；加载骨架、空状态和错误反馈使用同一表面层级。

- [x] **Step 4: 统一记录、表单、Bangumi、备份与反馈**

`AnimeList` 和 `AnimeForm` 导入 `next/image`，外部图片使用 `unoptimized`，提供明确 `sizes`。为每条记录动作加入：

```tsx
aria-label={`编辑《${anime.title}》`}
aria-label={`删除《${anime.title}》`}
```

表单、Bangumi 搜索、备份卡片和 `InlineFeedback` 迁移到语义字段、按钮、状态色和表面类；保留全部原有请求和回调逻辑。

- [x] **Step 5: 运行后台聚焦测试和 lint**

Run:

```powershell
npm test -- app/login/page.test.tsx app/admin/page.test.tsx components/admin components/anime-list.test.tsx components/anime-form.test.tsx components/bangumi-search.test.tsx components/backup-manager.test.tsx components/feedback
npm run lint
```

Expected: 全部 PASS；原有两个 `<img>` 警告消失，lint 0 errors/0 warnings。

- [x] **Step 6: 提交**

```powershell
git add app/login/page.tsx app/login/page.test.tsx app/admin/page.tsx app/admin/page.test.tsx components
git commit -m "style: unify admin workspace surfaces"
```

---

### Task 5: 文档、浏览器验收与完整验证

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/plans/2026-07-30-visual-system.md`

**Interfaces:**
- Consumes: Tasks 1–4 的完整实现。
- Produces: 更新后的视觉说明、验证证据和可合并主分支。

- [ ] **Step 1: 更新项目文档**

README 和 CLAUDE 记录“水光档案”令牌、语义类、2:3 封面、减少动态规则与 `next/image unoptimized` 约束，删除旧的固定透明度说明和“封面使用 `<img>`”说明。

- [ ] **Step 2: 运行完整自动化验证**

Run:

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected:

- 41 个或更多测试文件全部通过。
- TypeScript 无错误。
- ESLint 0 errors/0 warnings。
- Next.js 生产构建成功。
- Git 差异无空白错误。

- [ ] **Step 3: 浏览器视觉检查**

使用本地 JSON 存储启动开发服务，检查公开首页首屏、筛选、年份/季度、作品卡片、详情抽屉、空筛选和登录页。记录并修复：

- 文字与背景竞争。
- sticky Header/筛选重叠。
- 海报异常裁切。
- 水平溢出、控件不足 44px 或焦点不可见。
- 控制台新增错误。

- [ ] **Step 4: 提交文档与验收修正**

```powershell
git add README.md CLAUDE.md docs/superpowers/plans/2026-07-30-visual-system.md app components
git commit -m "docs: document waterlight visual system"
```

- [ ] **Step 5: 合并并在 main 复验**

在主工作树执行：

```powershell
git merge --ff-only codex/visual-system
npm test
npx tsc --noEmit
git diff origin/main..HEAD --check
```

Expected: 快进合并成功，主分支复验全部通过。

- [ ] **Step 6: 清理并推送**

删除本次 `codex/visual-system` 工作树和本地功能分支，仅保留其他已有工作树，然后：

```powershell
git push https://github.com/aimi8023/anime-diary.git main:main
```

Expected: GitHub `main` 更新到本次视觉系统最终提交。
