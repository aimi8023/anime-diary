# Server-First Public Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicate client-fetched homepage with a server-rendered, URL-filterable public anime archive organized by year and season.

**Architecture:** `app/page.tsx` reads the existing storage once on the server and passes records plus normalized URL filters to a focused client archive. Pure functions own parsing, filtering, sorting, grouping, and statistics; client components own controls, URL synchronization, collapsible results, and the record detail dialog. The public API and all admin, Bangumi, storage, and backup contracts remain unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Framer Motion 12, Vitest 4, Testing Library.

## Global Constraints

- Do not change `Anime`, the storage format, Redis keys, backup schemas, or public anime API responses.
- Keep `GET /api/anime` public and behavior-compatible, but do not use it from the homepage.
- Read anime records exactly once during each server render.
- Do not introduce a state library, pagination, image proxy, or new dependency.
- Treat storage failure as an error state, never an empty dataset.
- Preserve the existing `春`、`夏`、`秋`、`冬` values without migrating records.
- Combine valid filters with AND semantics; multiple tags require every selected tag.
- Use `router.replace(..., { scroll: false })` for URL updates.
- Keep the current visual language; full visual-system changes belong to the later visual-polish phase.
- Follow TDD for every production behavior.

---

### Task 1: Archive Filter, URL, Grouping, and Statistics Core

**Files:**
- Create: `lib/archive/types.ts`
- Create: `lib/archive/filter.ts`
- Create: `lib/archive/filter.test.ts`

**Interfaces:**
- Produces:
  - `ArchiveSort = "rating" | "title" | "added"`
  - `ArchiveSeason = "" | "春" | "夏" | "秋" | "冬"`
  - `ArchiveFilters`
  - `ArchiveSearchParams`
  - `ArchiveSeasonGroup`
  - `ArchiveYearGroup`
  - `ArchiveStats`
  - `DEFAULT_ARCHIVE_FILTERS`
  - `parseArchiveFilters(params)`
  - `serializeArchiveFilters(filters)`
  - `filterAnime(data, filters)`
  - `groupAnimeByYear(data, sort)`
  - `getArchiveOptions(data)`
  - `getArchiveStats(data)`

- [ ] **Step 1: Define test fixtures and write failing URL parsing tests**

Create `lib/archive/filter.test.ts` with literal anime records covering different titles, original titles, comments, years, seasons, tags, ratings, and creation times.

```ts
it("parses supported URL values and ignores invalid values", () => {
  expect(
    parseArchiveFilters({
      q: "  音乐  ",
      year: "2024",
      season: "夏",
      tag: "治愈,日常,治愈",
      rating: "8.3",
      sort: "unknown",
    }),
  ).toEqual({
    q: "音乐",
    year: "2024",
    season: "夏",
    tags: ["治愈", "日常"],
    rating: 8.5,
    sort: "rating",
  });
});

it("serializes only non-default filters", () => {
  expect(
    serializeArchiveFilters({
      ...DEFAULT_ARCHIVE_FILTERS,
      year: "2024",
      tags: ["日常", "治愈"],
    }).toString(),
  ).toBe("year=2024&tag=%E6%97%A5%E5%B8%B8%2C%E6%B2%BB%E6%84%88");
});
```

- [ ] **Step 2: Run the parser tests and verify RED**

Run:

```bash
npm test -- lib/archive/filter.test.ts
```

Expected: FAIL because the archive modules do not exist.

- [ ] **Step 3: Implement archive types and safe URL parsing**

Create `lib/archive/types.ts`:

```ts
import type { Anime } from "@/lib/types";

export type ArchiveSort = "rating" | "title" | "added";
export type ArchiveSeason = "" | "春" | "夏" | "秋" | "冬";
export type ArchiveSearchParams = Record<
  string,
  string | string[] | undefined
>;

export interface ArchiveFilters {
  q: string;
  year: string;
  season: ArchiveSeason;
  tags: string[];
  rating: number | null;
  sort: ArchiveSort;
}

export interface ArchiveSeasonGroup {
  season: string;
  records: Anime[];
}

export interface ArchiveYearGroup {
  year: string;
  seasons: ArchiveSeasonGroup[];
}

export interface ArchiveStats {
  total: number;
  seasonCount: number;
  earliestYear: string | null;
  latestYear: string | null;
}
```

Implement `parseArchiveFilters` for both server records and `URLSearchParams`. Clamp and round ratings to the nearest 0.5, deduplicate tags while preserving their first order, and fall back to `rating` sorting.

- [ ] **Step 4: Run parser tests and verify GREEN**

Run:

```bash
npm test -- lib/archive/filter.test.ts
```

Expected: parser and serializer tests PASS.

- [ ] **Step 5: Write failing filter, grouping, options, and statistics tests**

Add literal expectations for:

```ts
it("searches title, original title, tags, and comment", () => {
  expect(
    filterAnime(records, {
      ...DEFAULT_ARCHIVE_FILTERS,
      q: "乐队",
    }).map((anime) => anime.id),
  ).toEqual(["anime-1"]);
});

it("requires every selected tag and every other active condition", () => {
  expect(
    filterAnime(records, {
      q: "",
      year: "2024",
      season: "夏",
      tags: ["日常", "治愈"],
      rating: 8,
      sort: "rating",
    }).map((anime) => anime.id),
  ).toEqual(["anime-2"]);
});

it("groups years and seasons newest first without mutating input", () => {
  const original = structuredClone(records);
  const groups = groupAnimeByYear(records, "rating");
  expect(groups.map((group) => group.year)).toEqual(["2025", "2024"]);
  expect(records).toEqual(original);
});
```

Also cover all three sorts, invalid season strings, unique option ordering, empty data, and year-span statistics.

- [ ] **Step 6: Run core behavior tests and verify RED**

Run:

```bash
npm test -- lib/archive/filter.test.ts
```

Expected: FAIL because filtering, grouping, options, and statistics are missing.

- [ ] **Step 7: Implement pure archive behavior**

Implement functions without mutating caller arrays. Use `localeCompare` with `"zh-CN"` for titles, numeric parsing for year/season order, and timestamp comparison for `added`.

- [ ] **Step 8: Run task tests and commit**

Run:

```bash
npm test -- lib/archive/filter.test.ts
```

Expected: PASS.

Commit:

```bash
git add lib/archive
git commit -m "feat: add public archive filtering core"
```

---

### Task 2: Server-Rendered Homepage and Explicit Load States

**Files:**
- Rewrite: `app/page.tsx`
- Create: `app/page.test.tsx`
- Create: `components/archive/archive-load-error.tsx`
- Create: `components/archive/archive-browser.tsx`

**Interfaces:**
- Consumes:
  - `storage.getAll(): Promise<Anime[]>`
  - `parseArchiveFilters(searchParams): ArchiveFilters`
  - `getArchiveStats(data): ArchiveStats`
- Produces:
  - async `HomePage({ searchParams })`
  - `<ArchiveBrowser records initialFilters stats />`

- [ ] **Step 1: Write failing server-page tests**

Mock `@/lib/storage-factory` and `@/components/archive/archive-browser`. Call the async page function directly.

```tsx
it("reads records once and passes normalized filters to the archive", async () => {
  storage.getAll.mockResolvedValue(records);
  render(
    await HomePage({
      searchParams: Promise.resolve({ year: "2024", rating: "8.3" }),
    }),
  );
  expect(storage.getAll).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("archive-browser")).toHaveAttribute(
    "data-year",
    "2024",
  );
  expect(screen.getByTestId("archive-browser")).toHaveAttribute(
    "data-rating",
    "8.5",
  );
});

it("shows a reloadable error instead of an empty archive", async () => {
  storage.getAll.mockRejectedValue(new Error("unavailable"));
  render(await HomePage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "暂时无法读取追番记录",
  );
  expect(screen.getByRole("link", { name: "重新加载" })).toHaveAttribute(
    "href",
    "/",
  );
});
```

- [ ] **Step 2: Run page tests and verify RED**

Run:

```bash
npm test -- app/page.test.tsx
```

Expected: FAIL because the current page is client-fetched and has no server error state.

- [ ] **Step 3: Implement the server page and load error**

`app/page.tsx` must not contain `"use client"`, `useEffect`, or `fetch("/api/anime")`.

Use the Next.js 16 page signature:

```ts
interface HomePageProps {
  searchParams: Promise<ArchiveSearchParams>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const initialFilters = parseArchiveFilters(await searchParams);
  try {
    const records = await storage.getAll();
    return (
      <ArchiveBrowser
        records={records}
        initialFilters={initialFilters}
        stats={getArchiveStats(records)}
      />
    );
  } catch (error) {
    console.error("Failed to render public archive:", error);
    return <ArchiveLoadError />;
  }
}
```

Keep the initial `ArchiveBrowser` implementation minimal: render a stable container, total count, and an empty-data message. Later tasks add controls and results.

- [ ] **Step 4: Run page and existing API tests**

Run:

```bash
npm test -- app/page.test.tsx app/api/anime/route.test.ts
```

Expected: PASS and the public API remains unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/page.test.tsx components/archive/archive-load-error.tsx components/archive/archive-browser.tsx
git commit -m "feat: render public archive on the server"
```

---

### Task 3: Archive Hero, Filter Toolbar, and URL Synchronization

**Files:**
- Create: `components/archive/archive-hero.tsx`
- Create: `components/archive/archive-toolbar.tsx`
- Create: `components/archive/active-filters.tsx`
- Modify: `components/archive/archive-browser.tsx`
- Create: `components/archive/archive-browser.test.tsx`

**Interfaces:**
- Consumes:
  - `ArchiveFilters`
  - `ArchiveStats`
  - `getArchiveOptions(records)`
  - `filterAnime(records, filters)`
  - `serializeArchiveFilters(filters)`
- Produces:
  - `ArchiveToolbarProps`
  - debounced query updates
  - immediate select/tag/rating/sort updates
  - mobile filter panel

- [ ] **Step 1: Write failing initial-state and filtering tests**

Mock `next/navigation` with a stable `replace` spy and `useSearchParams`.

```tsx
it("renders initial URL filters and matching result count", () => {
  renderArchive({
    initialFilters: {
      ...DEFAULT_ARCHIVE_FILTERS,
      year: "2024",
      tags: ["治愈"],
    },
  });
  expect(screen.getByLabelText("年份")).toHaveValue("2024");
  expect(screen.getByText("找到 1 部")).toBeInTheDocument();
});

it("combines filters and clears them without fetching", async () => {
  const user = userEvent.setup();
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  renderArchive();
  await user.selectOptions(screen.getByLabelText("年份"), "2024");
  await user.selectOptions(screen.getByLabelText("最低评分"), "8");
  expect(screen.getByText("找到 1 部")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "清除全部筛选" }));
  expect(screen.getByText(`找到 ${records.length} 部`)).toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run archive-browser tests and verify RED**

Run:

```bash
npm test -- components/archive/archive-browser.test.tsx
```

Expected: FAIL because the hero, toolbar, and filter interactions do not exist.

- [ ] **Step 3: Implement hero, desktop controls, and active filters**

`ArchiveHero` renders the title, description, total, year span, season count, and the existing `Timer` as secondary content.

`ArchiveToolbar` renders:

- labelled keyword input;
- labelled year, season, minimum-rating, and sort selects;
- a tag menu with checkboxes;
- a mobile “筛选” button and conditionally rendered panel;
- `aria-expanded` and a close button for the mobile panel.

`ActiveFilters` renders the result count, one removable chip per active condition, and “清除全部筛选”.

- [ ] **Step 4: Implement state derivation and URL synchronization**

In `ArchiveBrowser`:

- keep one `ArchiveFilters` state;
- keep a `queryDraft` only for the debounced keyword;
- commit `queryDraft` after 250 ms;
- compute matching records with `useMemo`;
- serialize filters and call `router.replace(path, { scroll: false })`;
- skip replacement when the serialized query already matches `useSearchParams`;
- never call `fetch`.

- [ ] **Step 5: Write and run debounce/URL/mobile-panel tests**

Use fake timers for the keyword:

```tsx
it("debounces keyword URL updates and uses replace without scrolling", async () => {
  vi.useFakeTimers();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderArchive();
  await user.type(screen.getByLabelText("关键词"), "音乐");
  expect(replace).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(250);
  expect(replace).toHaveBeenLastCalledWith(
    "/?q=%E9%9F%B3%E4%B9%90",
    { scroll: false },
  );
});
```

Verify the mobile panel opens, closes, and updates the same filter state.

Run:

```bash
npm test -- components/archive/archive-browser.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/archive
git commit -m "feat: add archive filters and shareable URLs"
```

---

### Task 4: Year/Season Results and Record Detail Dialog

**Files:**
- Create: `components/archive/archive-results.tsx`
- Create: `components/archive/year-section.tsx`
- Create: `components/archive/archive-anime-card.tsx`
- Create: `components/archive/anime-detail-dialog.tsx`
- Create: `components/archive/archive-results.test.tsx`
- Create: `components/archive/anime-detail-dialog.test.tsx`
- Modify: `components/archive/archive-browser.tsx`

**Interfaces:**
- Consumes:
  - `groupAnimeByYear(filteredRecords, filters.sort)`
  - `Anime`
- Produces:
  - year and season disclosure UI
  - compact record cards
  - controlled detail dialog

- [ ] **Step 1: Write failing grouping and disclosure tests**

```tsx
it("renders years and seasons newest first", () => {
  render(<ArchiveResults records={records} sort="rating" onSelect={vi.fn()} />);
  const headings = screen.getAllByRole("heading", { level: 2 });
  expect(headings.map((heading) => heading.textContent)).toEqual([
    "2025 年",
    "2024 年",
  ]);
});

it("keeps the newest year open and allows older years to expand", async () => {
  const user = userEvent.setup();
  render(<ArchiveResults records={records} sort="rating" onSelect={vi.fn()} />);
  expect(screen.getByRole("button", { name: "2025 年" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "2024 年" }));
  expect(screen.getByRole("button", { name: "2024 年" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});
```

Also verify no-result copy and the clear-filter callback.

- [ ] **Step 2: Run result tests and verify RED**

Run:

```bash
npm test -- components/archive/archive-results.test.tsx
```

Expected: FAIL because result components do not exist.

- [ ] **Step 3: Implement year, season, card, and bounded motion**

- Render years newest first.
- Default the first year to open and older years closed.
- Keep season disclosure buttons inside each open year.
- Render cards in the existing responsive grid.
- Cap motion delay with `Math.min(index, 8) * 0.04`.
- Card buttons expose the accessible name `查看《标题》详情`.
- Cards show cover, title, rating, up to three tags, and one-line comment.

- [ ] **Step 4: Write failing dialog behavior tests**

```tsx
it("shows complete optional metadata and closes with Escape", async () => {
  const user = userEvent.setup();
  render(<DialogHarness anime={completeAnime} />);
  await user.click(screen.getByRole("button", { name: "打开详情" }));
  expect(screen.getByRole("dialog")).toHaveTextContent(completeAnime.comment);
  expect(screen.getByRole("link", { name: "在 Bangumi 查看" })).toHaveAttribute(
    "href",
    completeAnime.bangumiUrl,
  );
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "打开详情" })).toHaveFocus();
});
```

Also verify missing optional fields are omitted, the close button works, and clicking the backdrop closes only when the backdrop itself is targeted.

- [ ] **Step 5: Implement accessible detail dialog**

- Store the previously focused element when opening.
- Focus the close button after mount.
- Listen for Escape only while open.
- Restore focus after close.
- Use `role="dialog"`, `aria-modal`, and a labelled heading.
- Render a desktop side panel and mobile bottom-panel shape with responsive classes.
- Use `target="_blank"` plus `rel="noreferrer"` for Bangumi links.

- [ ] **Step 6: Integrate results and dialog into ArchiveBrowser**

`ArchiveBrowser` owns `selectedAnime: Anime | null`. `ArchiveResults` calls `onSelect`, and `AnimeDetailDialog` receives `anime` plus `onClose`.

- [ ] **Step 7: Run archive component tests and commit**

Run:

```bash
npm test -- components/archive
```

Expected: PASS.

Commit:

```bash
git add components/archive
git commit -m "feat: add archive browsing and record details"
```

---

### Task 5: Remove Global Search State and Simplify Site Navigation

**Files:**
- Create: `components/site-header.tsx`
- Create: `components/site-header.test.tsx`
- Modify: `app/layout.tsx`
- Delete: `components/search-context.tsx`
- Delete: `components/search-filter.tsx`
- Delete: `components/search-button-client.tsx`
- Delete: `components/season-section.tsx`
- Delete: `components/anime-card.tsx`

**Interfaces:**
- Consumes: homepage archive anchor `#archive`
- Produces: server-rendered header navigation without global anime state

- [ ] **Step 1: Write failing header tests**

```tsx
it("links search to the public archive without a client search dialog", () => {
  render(<SiteHeader />);
  expect(screen.getByRole("link", { name: "浏览档案" })).toHaveAttribute(
    "href",
    "/#archive",
  );
  expect(screen.queryByRole("dialog", { name: "搜索" })).not.toBeInTheDocument();
});

it("keeps the management entry visually secondary", () => {
  render(<SiteHeader />);
  expect(screen.getByRole("link", { name: "管理" })).toHaveAttribute(
    "href",
    "/admin",
  );
});
```

- [ ] **Step 2: Run header tests and verify RED**

Run:

```bash
npm test -- components/site-header.test.tsx
```

Expected: FAIL because `SiteHeader` does not exist.

- [ ] **Step 3: Extract the server header and remove global provider wiring**

`SiteHeader` contains:

- brand link to `/`;
- “浏览档案” link to `/#archive`;
- home link;
- secondary lock-style management link.

Rewrite `app/layout.tsx` to render `SiteHeader`, `main`, and footer directly. Remove `SearchProvider`, `SearchFilter`, and `SearchButtonClient` imports.

- [ ] **Step 4: Verify deleted components have no consumers**

Run:

```bash
rg -n "search-context|search-filter|search-button-client|components/season-section|components/anime-card" app components lib
```

Expected: no matches.

Delete the five obsolete components only after the search confirms that the archive replacements are active.

- [ ] **Step 5: Run header, homepage, admin, and full component tests**

Run:

```bash
npm test -- components/site-header.test.tsx app/page.test.tsx app/admin/page.test.tsx components
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx components
git commit -m "refactor: remove duplicate global anime search state"
```

---

### Task 6: Documentation, Visual Verification, and Full Regression

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/plans/2026-07-29-public-archive-data-flow.md`

**Interfaces:**
- Consumes: completed Tasks 1–5
- Produces: documented, visually checked, deployable first-stage archive

- [ ] **Step 1: Update project documentation**

Document:

- server-first homepage loading;
- shareable archive URL parameters;
- year/season browsing and record details;
- removal of global client search state;
- unchanged public API, admin, Bangumi, storage, and backup behavior.

Update the project tree in `CLAUDE.md` to include `lib/archive/` and `components/archive/`.

- [ ] **Step 2: Run focused automated verification**

Run:

```bash
npm test -- lib/archive components/archive app/page.test.tsx components/site-header.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run full automated verification**

Run:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected:

- every test passes;
- TypeScript exits 0;
- ESLint has 0 errors; report any existing unrelated warnings;
- production build exits 0.

- [ ] **Step 4: Inspect desktop and mobile behavior**

Start the local app with Redis variables unset and a review-only admin password. In the in-app browser verify:

- desktop homepage at approximately 1280×720;
- mobile homepage at approximately 390×844;
- no client “加载中” state;
- hero, toolbar, active filters, years, seasons, cards, and footer;
- keyword, year, season, tags, rating, sort, and clear;
- URL updates and survives reload;
- mobile filter panel;
- card detail open, Escape/close, and focus restoration;
- browser console has no application errors.

Do not mutate anime data during the visual check.

- [ ] **Step 5: Inspect the final diff**

Run:

```bash
git status --short
git diff --check
git diff --stat main...
rg -n "fetch\\(\"/api/anime\"" app/page.tsx components/archive app/layout.tsx
```

Expected:

- no generated output, credentials, local backups, or temporary files;
- no homepage/client archive fetch of `/api/anime`;
- only intended public-archive and documentation changes.

- [ ] **Step 6: Mark plan steps complete and commit documentation**

Check completed plan boxes, then:

```bash
git add README.md CLAUDE.md docs/superpowers/plans/2026-07-29-public-archive-data-flow.md
git commit -m "docs: document server-first public archive"
```

- [ ] **Step 7: Review and finish the branch**

Perform an inline requirements and diff review because this session does not permit reviewer subagent dispatch. Address all verified critical or important findings, rerun full verification, then use `superpowers:finishing-a-development-branch` with the already chosen workflow:

1. merge the feature branch into local `main`;
2. verify the merged result;
3. clean the owned worktree and feature branch;
4. push `main` only with the user’s existing explicit authorization for this repository.
