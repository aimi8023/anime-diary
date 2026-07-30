# Compact Archive Search and Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move archive search into a navigation-triggered responsive overlay, increase poster-grid density, and replace the narrow detail drawer with an immersive media detail layer.

**Architecture:** A root-level `ArchiveSearchProvider` owns only the open/closed state so the global header can launch the homepage search panel. `ArchiveBrowser` remains the owner of filter state, URL synchronization, result calculation, and the search form props. Cards become poster-first browse controls, while the existing portal-based detail component is restyled into one responsive centered-dialog/bottom-sheet structure.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Vitest, Testing Library

## Global Constraints

- Do not add or modify API routes.
- Do not change Redis data structures or backup formats.
- Do not add an anime detail route.
- Keep archive data server-fetched and client-filtered without additional requests.
- Desktop search is centered below the sticky header; mobile search is a bottom sheet.
- Cards show only cover, rating, season, and title.
- Grid density is 2 / 3 / 4 / 6 / 7 columns across narrow mobile, mobile, tablet, desktop, and large desktop.
- Desktop detail is centered and approximately `960px` wide; mobile detail is a near-full-screen bottom sheet.
- Preserve URL filter synchronization, browser history behavior, scroll locking, Escape handling, and focus restoration.

---

### Task 1: Archive search state and navigation launcher

**Files:**
- Create: `components/archive/archive-search-context.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/site-header.tsx`
- Modify: `components/site-header.test.tsx`
- Modify: `lib/archive/filter.ts`
- Modify: `lib/archive/filter.test.ts`

**Interfaces:**
- Produces: `ArchiveSearchProvider({ children })`
- Produces: `useArchiveSearch(): { isSearchOpen: boolean; openSearch(): void; closeSearch(): void }`
- Produces: `countActiveArchiveFilters(filters: ArchiveFilters): number`
- Consumes: existing `parseArchiveFilters()` for navigation badge state

- [ ] **Step 1: Add failing filter-count tests**

Add cases to `lib/archive/filter.test.ts`:

```ts
expect(countActiveArchiveFilters(DEFAULT_ARCHIVE_FILTERS)).toBe(0);
expect(
  countActiveArchiveFilters({
    ...DEFAULT_ARCHIVE_FILTERS,
    q: "音乐",
    year: "2024",
    tags: ["日常", "治愈"],
    sort: "title",
  }),
).toBe(5);
```

- [ ] **Step 2: Add failing header launcher tests**

Mock `usePathname`, `useRouter`, and `useSearchParams`. Render the header inside `ArchiveSearchProvider`, click “搜索档案”, and assert:

```ts
expect(screen.getByRole("button", { name: "搜索档案" })).toHaveAttribute(
  "aria-expanded",
  "false",
);
await user.click(screen.getByRole("button", { name: "搜索档案" }));
expect(screen.getByRole("button", { name: "搜索档案" })).toHaveAttribute(
  "aria-expanded",
  "true",
);
```

With `useSearchParams()` returning `q=音乐&year=2024&tag=日常,治愈`, assert the visible badge is `4`.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
npm test -- lib/archive/filter.test.ts components/site-header.test.tsx
```

Expected: failures because the count helper, provider, and search button do not exist.

- [ ] **Step 4: Implement active-filter counting**

Add to `lib/archive/filter.ts`:

```ts
export function countActiveArchiveFilters(filters: ArchiveFilters): number {
  return (
    Number(Boolean(filters.q)) +
    Number(Boolean(filters.year)) +
    Number(Boolean(filters.season)) +
    filters.tags.length +
    Number(filters.rating !== null) +
    Number(filters.sort !== "rating")
  );
}
```

- [ ] **Step 5: Implement the search provider**

Create `components/archive/archive-search-context.tsx` as a client component with a guarded context hook:

```tsx
interface ArchiveSearchContextValue {
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

export function ArchiveSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const value = useMemo(
    () => ({
      isSearchOpen,
      openSearch: () => setSearchOpen(true),
      closeSearch: () => setSearchOpen(false),
    }),
    [isSearchOpen],
  );
  return (
    <ArchiveSearchContext.Provider value={value}>
      {children}
    </ArchiveSearchContext.Provider>
  );
}
```

`useArchiveSearch()` must throw a clear error when used outside the provider.

- [ ] **Step 6: Wrap the global layout and convert the header launcher**

Wrap `SiteHeader`, `main`, and `footer` inside `ArchiveSearchProvider` in `app/layout.tsx`.

Convert `SiteHeader` to a client component. Use:

```tsx
const filters = parseArchiveFilters(useSearchParams());
const activeCount = countActiveArchiveFilters(filters);
const { isSearchOpen, openSearch } = useArchiveSearch();

function launchSearch() {
  openSearch();
  if (pathname !== "/") router.push("/");
}
```

Replace the redundant “浏览档案” link with the search button. Keep the brand, “首页”, and “管理” destinations. The button must expose `aria-controls="archive-search-panel"` and `aria-expanded`.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```powershell
npm test -- lib/archive/filter.test.ts components/site-header.test.tsx
```

Expected: both files pass.

- [ ] **Step 8: Commit**

```powershell
git add app/layout.tsx components/site-header.tsx components/site-header.test.tsx components/archive/archive-search-context.tsx lib/archive/filter.ts lib/archive/filter.test.ts
git commit -m "feat: launch archive search from navigation"
```

---

### Task 2: Responsive search overlay and archive integration

**Files:**
- Create: `components/archive/archive-search-panel.tsx`
- Delete: `components/archive/archive-toolbar.tsx`
- Modify: `components/archive/archive-browser.tsx`
- Modify: `components/archive/archive-browser.test.tsx`

**Interfaces:**
- Consumes: `useArchiveSearch()`
- Consumes: existing `ArchiveFilters`, `ArchiveOptions`, `ArchiveSeason`, and `ArchiveSort`
- Produces: `ArchiveSearchPanel(props: ArchiveSearchPanelProps)`
- Keeps: existing filter callbacks owned by `ArchiveBrowser`

- [ ] **Step 1: Rewrite browser tests for hidden-by-default search**

Wrap the test render in `ArchiveSearchProvider` and include a test launcher that calls `openSearch()`.

Add assertions:

```ts
expect(
  screen.queryByRole("dialog", { name: "搜索与筛选" }),
).not.toBeInTheDocument();
await user.click(screen.getByRole("button", { name: "打开搜索" }));
expect(
  screen.getByRole("dialog", { name: "搜索与筛选" }),
).toBeInTheDocument();
expect(screen.getByLabelText("关键词")).toHaveFocus();
```

Change existing filter tests so they open the panel before selecting fields. Add tests for Escape, close button, backdrop close, body scroll restoration, and retaining selected filter values after reopening.

- [ ] **Step 2: Run the browser test and verify RED**

Run:

```powershell
npm test -- components/archive/archive-browser.test.tsx
```

Expected: failures because search is still always visible and no context-driven dialog exists.

- [ ] **Step 3: Move filter fields into `ArchiveSearchPanel`**

Move the `FilterFields`, season list, rating list, and form markup from `archive-toolbar.tsx` into the new file.

Render a single responsive portal:

```tsx
return createPortal(
  <div
    aria-label="搜索与筛选"
    aria-modal="true"
    className="fixed inset-0 z-50 flex items-end bg-[#211d35]/28 p-0 backdrop-blur-sm md:items-start md:justify-center md:px-6 md:pt-20"
    id="archive-search-panel"
    onClick={closeFromBackdrop}
    role="dialog"
  >
    <form
      aria-label="档案筛选"
      className="max-h-[88vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/90 bg-[var(--canvas)] p-5 shadow-[var(--shadow-lg)] md:max-w-3xl md:rounded-[1.75rem] md:p-6"
      onSubmit={(event) => event.preventDefault()}
      role="search"
    >
      {/* title, close button, FilterFields */}
    </form>
  </div>,
  document.body,
);
```

Use an input ref to focus the keyword field when opened. Capture the previous focused element, lock body scrolling, close on Escape, and restore focus and overflow during cleanup.

- [ ] **Step 4: Replace the persistent toolbar**

In `ArchiveBrowser`:

- remove `ArchiveToolbar`;
- render `ArchiveSearchPanel` after `ArchiveHero`;
- keep `ActiveFilters` directly above results;
- pass the existing filter state and callbacks into the panel.

Delete `components/archive/archive-toolbar.tsx`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
npm test -- components/archive/archive-browser.test.tsx components/site-header.test.tsx
```

Expected: search is absent by default, opens through context, filters still update results and URL, and all close paths pass.

- [ ] **Step 6: Commit**

```powershell
git add components/archive/archive-search-panel.tsx components/archive/archive-browser.tsx components/archive/archive-browser.test.tsx components/archive/archive-toolbar.tsx
git commit -m "feat: add responsive archive search overlay"
```

---

### Task 3: Compact poster cards and denser archive grid

**Files:**
- Modify: `components/archive/archive-anime-card.tsx`
- Modify: `components/archive/year-section.tsx`
- Modify: `components/archive/archive-results.test.tsx`

**Interfaces:**
- Keeps: `ArchiveAnimeCard({ anime, index, onSelect })`
- Keeps: `YearSection({ group, initiallyOpen, onSelect })`
- Changes only presentation; selection and grouping contracts remain unchanged

- [ ] **Step 1: Add failing compact-card assertions**

In `archive-results.test.tsx`, render an open year and assert:

```ts
expect(screen.getByText("2025春")).toBeInTheDocument();
expect(screen.getByText("葬送的芙莉莲")).toBeInTheDocument();
expect(screen.queryByText("时间与记忆")).not.toBeInTheDocument();
expect(screen.queryByText("奇幻")).not.toBeInTheDocument();
```

Also assert the open season grid has `lg:grid-cols-6` and `xl:grid-cols-7`.

- [ ] **Step 2: Run the result test and verify RED**

Run:

```powershell
npm test -- components/archive/archive-results.test.tsx
```

Expected: comment/tag absence and dense-grid class assertions fail.

- [ ] **Step 3: Simplify `ArchiveAnimeCard`**

Remove tag and comment rendering. Use:

- card radius around `0.9rem`;
- compact title area padding `0.65rem`;
- smaller rating badge;
- image sizes matching 2 / 3 / 4 / 6 / 7 columns;
- title remains two lines;
- existing eager loading only for the first visible poster.

- [ ] **Step 4: Increase grid density and shorten headers**

Change the season grid to:

```tsx
className="grid grid-cols-2 gap-2.5 pb-5 min-[420px]:grid-cols-3 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6 xl:grid-cols-7"
```

Reduce year button height to `min-h-16`, year title to `text-xl`, and season button to approximately `min-h-12`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
npm test -- components/archive/archive-results.test.tsx
```

Expected: all archive result tests pass.

- [ ] **Step 6: Commit**

```powershell
git add components/archive/archive-anime-card.tsx components/archive/year-section.tsx components/archive/archive-results.test.tsx
git commit -m "style: increase archive poster density"
```

---

### Task 4: Immersive responsive anime detail layer

**Files:**
- Modify: `components/archive/anime-detail-dialog.tsx`
- Modify: `components/archive/anime-detail-dialog.test.tsx`

**Interfaces:**
- Keeps: `AnimeDetailDialog({ anime: Anime | null, onClose(): void })`
- Keeps: portal rendering, Escape close, backdrop close, scroll lock, and focus restoration
- Adds: responsive centered desktop / bottom-sheet mobile presentation

- [ ] **Step 1: Expand detail behavior tests**

Add semantic assertions:

```ts
expect(dialog).toHaveAttribute("data-layout", "immersive");
expect(screen.getByText("我的感想")).toBeInTheDocument();
expect(screen.getByText("音乐")).toBeInTheDocument();
expect(screen.getByText("2022-10-09")).toBeInTheDocument();
```

Add a coverless record case and assert the unified `封面暂缺` status appears. Keep the existing optional-metadata, backdrop, Escape, focus, and scroll-lock tests.

- [ ] **Step 2: Run detail tests and verify RED**

Run:

```powershell
npm test -- components/archive/anime-detail-dialog.test.tsx
```

Expected: new layout marker, section title, and cover placeholder assertions fail.

- [ ] **Step 3: Rebuild the responsive visual structure**

Use one portal overlay with:

- `items-end` on mobile and `md:items-center` on desktop;
- `max-h-[94vh] w-full rounded-t-[2rem]` on mobile;
- `md:max-w-[960px] md:rounded-[2rem]` on desktop;
- a `md:grid md:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.35fr)]` inner layout.

The cover column contains:

- an absolute blurred copy of the cover at low opacity;
- a crisp `2:3` poster above it;
- a labeled placeholder when cover is unavailable.

The content column contains title, original title, rating, metadata blocks, tags, “我的感想”, and the Bangumi link. Keep the close button sticky/absolute and visible.

- [ ] **Step 4: Add motion that respects user preferences**

Use `motion.div` and `useReducedMotion()`:

```tsx
initial={{ opacity: 0, y: reduceMotion ? 0 : 18, scale: reduceMotion ? 1 : 0.985 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
transition={{ duration: reduceMotion ? 0 : 0.22 }}
```

Do not introduce exit-state complexity; the layer may unmount immediately on close.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
npm test -- components/archive/anime-detail-dialog.test.tsx components/archive/archive-results.test.tsx
```

Expected: all detail and card-selection tests pass.

- [ ] **Step 6: Commit**

```powershell
git add components/archive/anime-detail-dialog.tsx components/archive/anime-detail-dialog.test.tsx
git commit -m "style: redesign immersive anime details"
```

---

### Task 5: Full regression, responsive browser QA, and rollout

**Files:**
- Modify if verification exposes a defect: only files already listed above
- Modify: `docs/superpowers/plans/2026-07-30-compact-archive-search-detail.md` to mark completed checkpoints

**Interfaces:**
- Produces: fully verified `main` branch and deployed archive UI

- [ ] **Step 1: Run all automated verification**

Run:

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected:

- all Vitest files pass;
- TypeScript exits `0`;
- ESLint exits `0` with no warnings;
- Next.js production build succeeds.

- [ ] **Step 2: Run desktop browser QA with production data**

Start the local app with the configured Redis environment. At a desktop viewport:

- confirm the full search form is absent on initial load;
- open search from the navigation;
- confirm the centered panel appears and keyword input is focused;
- apply a year and tag filter;
- close and reopen, confirming values persist;
- expand a year and confirm six or seven cards per row at the applicable width;
- open an anime and confirm the centered immersive detail;
- close with Escape and confirm focus returns to the poster;
- confirm browser console has no errors.

- [ ] **Step 3: Run mobile browser QA**

At a `390 × 844` viewport:

- confirm search opens as a bottom sheet;
- confirm the navigation search text is hidden but its accessible name remains;
- confirm the poster grid shows three columns at normal mobile width;
- confirm detail opens as a near-full-screen bottom sheet;
- confirm close button and content remain reachable without background scrolling.

- [ ] **Step 4: Review the final diff**

Run:

```powershell
git status --short
git diff --check
git diff --stat main...
```

Expected: no unrelated files, no whitespace errors, and only planned UI, tests, spec, and plan changes.

- [ ] **Step 5: Merge or fast-forward into `main`**

If implementation used a worktree branch:

```powershell
git switch main
git merge --ff-only codex/compact-archive-search-detail
```

If implementation ran directly on `main`, confirm `git branch --show-current` returns `main`.

- [ ] **Step 6: Push and monitor deployment**

```powershell
git push https://github.com/aimi8023/anime-diary.git main:main
```

Wait until `https://anime.zhanghome.qzz.io/` serves the new navigation search and compact card layout.

- [ ] **Step 7: Run production smoke QA**

On the custom domain:

- open and close search;
- expand 2025 and one older year containing legacy records;
- open and close one detail layer;
- confirm no “This page couldn’t load” screen and no console errors.
