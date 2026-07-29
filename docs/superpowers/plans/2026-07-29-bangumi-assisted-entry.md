# Bangumi Assisted Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an administrator-only, on-demand Bangumi search flow that prefills the existing anime form while preserving manual entry and local snapshot ownership.

**Architecture:** The browser calls authenticated Next.js route handlers, which delegate to a small `lib/bangumi` adapter. The adapter owns Bangumi HTTP details and maps unstable third-party responses into stable internal types. Existing JSON/Redis storage remains authoritative and gains exact `bangumiId` duplicate lookup.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Vitest, Testing Library, Tailwind CSS 4, existing JSON/Upstash Redis storage.

## Global Constraints

- Import only records explicitly selected by the administrator; never bulk-import Bangumi.
- Keep the existing manual-entry path available when Bangumi is unavailable.
- Persist local snapshots; the public homepage must not call Bangumi.
- Do not write personal ratings, comments, or tags back to Bangumi.
- Treat suggested Bangumi tags as opt-in buttons and cap them at 12.
- Protect `/api/bangumi/:path*` with the existing administrator cookie.
- Keep all new `Anime` fields optional so the existing seven records require no migration.
- Use a project-specific `User-Agent`; never expose or log `BANGUMI_ACCESS_TOKEN`.
- Mock Bangumi in automated tests; tests must not depend on the live service.
- Do not implement collection sync, episode-progress sync, automatic refresh, or multi-user accounts.

---

## File Structure

**Create**

- `vitest.config.ts` — Vitest aliases and Node/jsdom project configuration.
- `vitest.setup.ts` — DOM matcher and test cleanup setup.
- `lib/bangumi/types.ts` — raw response fragments and stable internal DTOs.
- `lib/bangumi/mapper.ts` — pure field, season, cover, episode, and tag conversion.
- `lib/bangumi/mapper.test.ts` — mapper boundary and fallback tests.
- `lib/bangumi/client.ts` — timeout, headers, upstream calls, error normalization, short-lived cache.
- `lib/bangumi/client.test.ts` — mocked HTTP behavior tests.
- `app/api/bangumi/search/route.ts` — authenticated internal search handler.
- `app/api/bangumi/search/route.test.ts` — search validation and response tests.
- `app/api/bangumi/subjects/[id]/route.ts` — internal detail/prefill handler.
- `app/api/bangumi/subjects/[id]/route.test.ts` — ID validation and detail tests.
- `app/api/anime/route.test.ts` — duplicate-create coverage.
- `app/api/anime/[id]/route.test.ts` — duplicate-update coverage.
- `proxy.test.ts` — middleware authentication coverage for Bangumi routes.
- `components/bangumi-search.tsx` — search/results/loading/error/selection UI.
- `components/bangumi-search.test.tsx` — administrator search interaction tests.
- `components/anime-form.test.tsx` — suggested-tag selection tests.

**Modify**

- `package.json` and `package-lock.json` — test scripts and development dependencies.
- `.gitignore` — allow the safe environment example to be committed.
- `lib/types.ts` — optional Bangumi metadata.
- `lib/storage.ts` — `findByBangumiId` storage contract.
- `lib/storage-json.ts` — JSON duplicate lookup.
- `lib/storage-kv.ts` — Redis duplicate lookup.
- `app/api/anime/route.ts` — duplicate create guard.
- `app/api/anime/[id]/route.ts` — metadata updates and duplicate update guard.
- `proxy.ts` — protect `/api/bangumi/:path*`.
- `components/anime-form.tsx` — partial initial data and opt-in suggested tags.
- `app/admin/page.tsx` — Bangumi/manual modes and prefill state.
- `.env.local.example` — documented server-side Bangumi configuration.
- `README.md` — setup and administrator workflow.

---

### Task 1: Test Harness and Pure Bangumi Mapping

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `lib/bangumi/types.ts`
- Create: `lib/bangumi/mapper.ts`
- Create: `lib/bangumi/mapper.test.ts`

**Interfaces:**
- Produces: `seasonFromAirDate(airDate: string | undefined): string`
- Produces: `mapSearchSubject(subject: BangumiSubjectSummary): BangumiSearchResult`
- Produces: `mapSubjectToPrefill(subject: BangumiSubject): BangumiPrefill`
- Produces: stable `BangumiSearchResult` and `BangumiPrefill` types used by all later tasks.

- [ ] **Step 1: Install the test dependencies and add scripts**

Run:

```powershell
npm install --save-dev vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Add these scripts to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    clearMocks: true,
  },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

- [ ] **Step 2: Write failing mapper tests**

Create `lib/bangumi/mapper.test.ts` with tests that assert:

```ts
expect(seasonFromAirDate("2026-03-31")).toBe("2026春");
expect(seasonFromAirDate("2026-04-01")).toBe("2026夏");
expect(seasonFromAirDate("2026-06-30")).toBe("2026夏");
expect(seasonFromAirDate("2026-07-01")).toBe("2026秋");
expect(seasonFromAirDate("2026-09-30")).toBe("2026秋");
expect(seasonFromAirDate("2026-10-01")).toBe("2026冬");
expect(seasonFromAirDate("invalid")).toBe("");
```

Also construct raw subjects and assert:

```ts
expect(prefill.title).toBe("孤独摇滚！");
expect(prefill.originalTitle).toBe("ぼっち・ざ・ろっく！");
expect(prefill.cover).toBe("https://lain.bgm.tv/large.jpg");
expect(prefill.episodes).toBe(12);
expect(prefill.suggestedTags).toEqual([
  "芳文社",
  "音乐",
  "青春",
  "乐队",
  "日常",
  "喜剧",
  "成长",
  "校园",
  "漫画改",
  "治愈",
  "轻百合",
  "2022",
]);
```

Add separate cases for:

- empty `name_cn` falling back to `name`;
- cover fallback `large → common → medium → ""`;
- missing/negative episode counts becoming `0`;
- blank and duplicate tags being removed before the 12-tag cap.

- [ ] **Step 3: Run the mapper tests and verify the expected failure**

Run:

```powershell
npm test -- lib/bangumi/mapper.test.ts
```

Expected: FAIL because `types.ts` and mapper exports do not exist.

- [ ] **Step 4: Define the stable and raw types**

Create `lib/bangumi/types.ts` with narrow raw interfaces:

```ts
export interface BangumiImages {
  large?: string;
  common?: string;
  medium?: string;
}

export interface BangumiTag {
  name?: string;
  count?: number;
}

export interface BangumiSubjectSummary {
  id: number;
  name: string;
  name_cn?: string;
  date?: string;
  eps?: number;
  images?: BangumiImages | null;
}

export interface BangumiSubject extends BangumiSubjectSummary {
  tags?: BangumiTag[];
}

export interface BangumiSearchResult {
  bangumiId: number;
  bangumiUrl: string;
  title: string;
  originalTitle: string;
  cover: string;
  airDate: string;
  episodes: number;
  alreadyAdded?: boolean;
  localAnimeId?: string;
}

export interface BangumiPrefill {
  bangumiId: number;
  bangumiUrl: string;
  title: string;
  originalTitle: string;
  cover: string;
  airDate: string;
  season: string;
  episodes: number;
  suggestedTags: string[];
}
```

- [ ] **Step 5: Implement the minimal pure mapper**

Create `lib/bangumi/mapper.ts`:

```ts
import type {
  BangumiPrefill,
  BangumiSearchResult,
  BangumiSubject,
  BangumiSubjectSummary,
} from "./types";

const validDate = /^(\d{4})-(\d{2})-(\d{2})$/;

export function seasonFromAirDate(airDate?: string): string {
  if (!airDate) return "";
  const match = airDate.match(validDate);
  if (!match) return "";
  const month = Number(match[2]);
  if (month < 1 || month > 12) return "";
  const season = month <= 3 ? "春" : month <= 6 ? "夏" : month <= 9 ? "秋" : "冬";
  return `${match[1]}${season}`;
}

function titleOf(subject: BangumiSubjectSummary): string {
  return subject.name_cn?.trim() || subject.name.trim();
}

function coverOf(subject: BangumiSubjectSummary): string {
  return subject.images?.large || subject.images?.common || subject.images?.medium || "";
}

function episodesOf(subject: BangumiSubjectSummary): number {
  return Number.isFinite(subject.eps) && (subject.eps ?? 0) > 0 ? Number(subject.eps) : 0;
}

export function mapSearchSubject(subject: BangumiSubjectSummary): BangumiSearchResult {
  return {
    bangumiId: subject.id,
    bangumiUrl: `https://bgm.tv/subject/${subject.id}`,
    title: titleOf(subject),
    originalTitle: subject.name.trim(),
    cover: coverOf(subject),
    airDate: validDate.test(subject.date ?? "") ? subject.date! : "",
    episodes: episodesOf(subject),
  };
}

export function mapSubjectToPrefill(subject: BangumiSubject): BangumiPrefill {
  const base = mapSearchSubject(subject);
  const suggestedTags = [...new Set(
    (subject.tags ?? []).map((tag) => tag.name?.trim()).filter((tag): tag is string => Boolean(tag))
  )].slice(0, 12);
  return {
    ...base,
    season: seasonFromAirDate(base.airDate),
    suggestedTags,
  };
}
```

- [ ] **Step 6: Run mapper tests and the existing linter**

Run:

```powershell
npm test -- lib/bangumi/mapper.test.ts
npm run lint
```

Expected: mapper tests PASS; lint has no errors (the three existing `<img>` warnings may remain).

- [ ] **Step 7: Commit the mapping unit**

```powershell
git add package.json package-lock.json vitest.config.ts vitest.setup.ts lib/bangumi
git commit -m "test: add Bangumi mapping foundation"
```

---

### Task 2: Bangumi HTTP Client and Error Normalization

**Files:**
- Create: `lib/bangumi/client.ts`
- Create: `lib/bangumi/client.test.ts`

**Interfaces:**
- Consumes: raw types and mappers from Task 1.
- Produces: `searchBangumiSubjects(keyword: string): Promise<BangumiSearchResult[]>`
- Produces: `getBangumiPrefill(id: number): Promise<BangumiPrefill>`
- Produces: `BangumiClientError` with `kind: "timeout" | "rate_limit" | "not_found" | "upstream" | "invalid_response"`.
- Produces: process-local best-effort caches with 5-minute search and 1-hour detail TTLs.

- [ ] **Step 1: Write failing client tests with mocked `fetch`**

Create `lib/bangumi/client.test.ts`. Save and restore `global.fetch` and environment variables. Cover:

```ts
expect(fetch).toHaveBeenCalledWith(
  "https://api.bgm.tv/v0/search/subjects?limit=8&offset=0",
  expect.objectContaining({
    method: "POST",
    headers: expect.objectContaining({
      "Content-Type": "application/json",
      "User-Agent": expect.stringContaining("anime-diary"),
    }),
  })
);
```

Assert the request body equals:

```json
{
  "keyword": "孤独摇滚",
  "sort": "match",
  "filter": { "type": [2], "nsfw": false }
}
```

Also assert:

- `Authorization: Bearer <token>` is present only when `BANGUMI_ACCESS_TOKEN` is set;
- successful search maps `data` through `mapSearchSubject`;
- detail maps through `mapSubjectToPrefill`;
- repeating the same search within 5 minutes performs one upstream request;
- advancing fake time beyond 5 minutes causes search to request upstream again;
- repeating the same detail lookup within 1 hour performs one upstream request;
- clearing the test cache prevents one test from affecting another;
- HTTP 404 becomes `kind: "not_found"`;
- HTTP 429 becomes `kind: "rate_limit"`;
- an aborted request becomes `kind: "timeout"`;
- malformed JSON/data becomes `kind: "invalid_response"`.

- [ ] **Step 2: Run the client test and verify it fails**

Run:

```powershell
npm test -- lib/bangumi/client.test.ts
```

Expected: FAIL because `client.ts` does not exist.

- [ ] **Step 3: Implement the client**

Create `lib/bangumi/client.ts` with:

```ts
const API_BASE = "https://api.bgm.tv";
const TIMEOUT_MS = 8_000;
const SEARCH_TTL_MS = 5 * 60 * 1_000;
const DETAIL_TTL_MS = 60 * 60 * 1_000;

export class BangumiClientError extends Error {
  constructor(
    public readonly kind:
      | "timeout"
      | "rate_limit"
      | "not_found"
      | "upstream"
      | "invalid_response",
    message: string,
  ) {
    super(message);
  }
}
```

Add a small process-local cache:

```ts
interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const searchCache = new Map<string, CacheEntry<BangumiSearchResult[]>>();
const detailCache = new Map<number, CacheEntry<BangumiPrefill>>();

function getCached<K, V>(cache: Map<K, CacheEntry<V>>, key: K): V | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function clearBangumiCacheForTests(): void {
  searchCache.clear();
  detailCache.clear();
}
```

Normalize the search cache key with `keyword.trim().toLocaleLowerCase()`. Cache only successful mapped responses; never cache errors. Return new array values to callers so route decoration cannot mutate cached results.

Build headers on each request:

```ts
const headers: Record<string, string> = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": process.env.BANGUMI_USER_AGENT || "anime-diary/private",
};
if (process.env.BANGUMI_ACCESS_TOKEN) {
  headers.Authorization = `Bearer ${process.env.BANGUMI_ACCESS_TOKEN}`;
}
```

Use `AbortSignal.timeout(TIMEOUT_MS)`. Validate only the minimum response shape (`data` array for search; positive numeric `id` and string `name` for detail) before mapping. Do not log request headers or raw responses.

- [ ] **Step 4: Run client and mapper tests**

Run:

```powershell
npm test -- lib/bangumi/client.test.ts lib/bangumi/mapper.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the HTTP client**

```powershell
git add lib/bangumi/client.ts lib/bangumi/client.test.ts
git commit -m "feat: add Bangumi API client"
```

---

### Task 3: Bangumi Metadata and Exact Duplicate Lookup

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/storage.ts`
- Modify: `lib/storage-json.ts`
- Modify: `lib/storage-kv.ts`
- Create: `app/api/anime/route.test.ts`
- Create: `app/api/anime/[id]/route.test.ts`
- Modify: `app/api/anime/route.ts`
- Modify: `app/api/anime/[id]/route.ts`

**Interfaces:**
- Produces: optional `bangumiId`, `bangumiUrl`, `originalTitle`, and `airDate` on `Anime`/`AnimeInput`.
- Produces: `Storage.findByBangumiId(bangumiId: number): Promise<Anime | null>`.
- Produces: HTTP `409 { error, existingId }` for duplicate Bangumi IDs.

- [ ] **Step 1: Extend the model and storage contract**

Add to both `Anime` and `AnimeInput`:

```ts
bangumiId?: number;
bangumiUrl?: string;
originalTitle?: string;
airDate?: string;
```

Add to `Storage`:

```ts
findByBangumiId(bangumiId: number): Promise<Anime | null>;
```

Implement it in both storage adapters by reading the current list and returning:

```ts
list.find((anime) => anime.bangumiId === bangumiId) ?? null
```

No index or migration is required at the current data size.

- [ ] **Step 2: Write failing create/update duplicate tests**

Mock `@/lib/storage-factory` in both route test files.

For create, submit an `AnimeInput` with `bangumiId: 352821`, mock:

```ts
storage.findByBangumiId.mockResolvedValue({ id: "existing-id", bangumiId: 352821, ...record });
```

Assert:

```ts
expect(response.status).toBe(409);
expect(await response.json()).toEqual({
  error: "该 Bangumi 条目已收录",
  existingId: "existing-id",
});
expect(storage.add).not.toHaveBeenCalled();
```

For update, cover:

- the found record has the same route ID: update is allowed;
- the found record has another ID: return `409`;
- metadata strings are trimmed and a positive integer `bangumiId` is accepted.

- [ ] **Step 3: Run duplicate tests and verify they fail**

Run:

```powershell
npm test -- app/api/anime/route.test.ts app/api/anime/[id]/route.test.ts
```

Expected: FAIL because the handlers do not query `findByBangumiId`.

- [ ] **Step 4: Add duplicate guards and metadata normalization**

Before create:

```ts
if (body.bangumiId !== undefined) {
  const existing = await storage.findByBangumiId(Number(body.bangumiId));
  if (existing) {
    return NextResponse.json(
      { error: "该 Bangumi 条目已收录", existingId: existing.id },
      { status: 409 },
    );
  }
}
```

Normalize `bangumiId` only when it is a positive integer; otherwise omit it. Trim the three optional metadata strings.

Before update, query only when `body.bangumiId` is present. Return `409` only when `existing.id !== id`.

- [ ] **Step 5: Run duplicate tests and all mapping/client tests**

Run:

```powershell
npm test -- app/api/anime/route.test.ts app/api/anime/[id]/route.test.ts lib/bangumi
```

Expected: all tests PASS.

- [ ] **Step 6: Commit model, storage, and duplicate protection**

```powershell
git add lib/types.ts lib/storage.ts lib/storage-json.ts lib/storage-kv.ts app/api/anime
git commit -m "feat: persist Bangumi metadata safely"
```

---

### Task 4: Authenticated Internal Bangumi Routes

**Files:**
- Create: `app/api/bangumi/search/route.ts`
- Create: `app/api/bangumi/search/route.test.ts`
- Create: `app/api/bangumi/subjects/[id]/route.ts`
- Create: `app/api/bangumi/subjects/[id]/route.test.ts`
- Modify: `proxy.ts`
- Create: `proxy.test.ts`

**Interfaces:**
- Consumes: client methods from Task 2 and `storage.findByBangumiId` from Task 3.
- Produces: `GET /api/bangumi/search?q=...`.
- Produces: `GET /api/bangumi/subjects/:id`.

- [ ] **Step 1: Write failing route tests**

Search tests:

- missing/blank `q` returns `400`;
- query longer than 100 characters returns `400`;
- client receives the trimmed keyword;
- results are decorated with `alreadyAdded` and `localAnimeId` from exact `bangumiId` lookup;
- timeout/rate-limit/upstream client errors map to `504/503/502`.

Detail tests:

- non-positive or non-integer ID returns `400`;
- client receives the numeric ID;
- not-found maps to `404`;
- timeout/rate-limit/upstream maps to `504/503/502`.

Use helpers in the test to construct requests:

```ts
new Request("http://localhost/api/bangumi/search?q=%E5%AD%A4%E7%8B%AC%E6%91%87%E6%BB%9A")
```

- [ ] **Step 2: Write the failing middleware tests**

Create `proxy.test.ts` using `NextRequest`. Set `ADMIN_PASSWORD`, then assert:

- unauthenticated `/api/bangumi/search` returns `401`;
- a valid SHA-256 `admin_token` cookie passes through;
- the exported matcher includes `"/api/bangumi/:path*"`.

- [ ] **Step 3: Run route and middleware tests and verify failure**

Run:

```powershell
npm test -- app/api/bangumi proxy.test.ts
```

Expected: FAIL because routes and matcher do not exist.

- [ ] **Step 4: Implement route error mapping**

In each route, use one local helper:

```ts
function upstreamErrorResponse(error: unknown) {
  if (error instanceof BangumiClientError) {
    const status = {
      timeout: 504,
      rate_limit: 503,
      not_found: 404,
      upstream: 502,
      invalid_response: 502,
    }[error.kind];
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ error: "Bangumi 服务暂时不可用" }, { status: 502 });
}
```

Search each returned `bangumiId` through `storage.findByBangumiId` and decorate the DTO without mutating the client result.

- [ ] **Step 5: Protect the routes in `proxy.ts`**

Treat Bangumi routes as protected API routes:

```ts
if (pathname.startsWith("/api/bangumi")) {
  if (!isAuthenticated) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  return NextResponse.next();
}
```

Add `"/api/bangumi/:path*"` to `config.matcher`.

- [ ] **Step 6: Run route/middleware tests and lint**

Run:

```powershell
npm test -- app/api/bangumi proxy.test.ts
npm run lint
```

Expected: tests PASS and lint has no errors.

- [ ] **Step 7: Commit the authenticated proxy routes**

```powershell
git add app/api/bangumi proxy.ts proxy.test.ts
git commit -m "feat: add protected Bangumi proxy routes"
```

---

### Task 5: Opt-In Suggested Tags in the Existing Form

**Files:**
- Create: `components/anime-form.test.tsx`
- Modify: `components/anime-form.tsx`

**Interfaces:**
- Produces: `AnimeForm` accepts `initial?: Partial<AnimeInput> | null`.
- Produces: `AnimeForm` accepts `suggestedTags?: string[]`.
- Preserves: `onSave(data: AnimeInput)` and manual tag input.

- [ ] **Step 1: Write failing form interaction tests**

Start `components/anime-form.test.tsx` with:

```ts
// @vitest-environment jsdom
```

Render:

```tsx
<AnimeForm
  initial={{ title: "孤独摇滚！", season: "2022秋", tags: [] }}
  suggestedTags={["音乐", "青春", "音乐"]}
  onSave={onSave}
  onCancel={() => {}}
/>
```

Assert:

- title and season are prefilled;
- “音乐”和“青春” appear once as candidate buttons;
- no suggested tag is initially in the selected tag list;
- clicking “音乐” adds it to selected tags and removes its candidate button;
- clicking it cannot create a duplicate;
- manually entering “年度最佳” still works;
- submitting calls `onSave` with Bangumi metadata from `initial` preserved.

- [ ] **Step 2: Run the form test and verify it fails**

Run:

```powershell
npm test -- components/anime-form.test.tsx
```

Expected: FAIL because `suggestedTags` and partial initial data are unsupported.

- [ ] **Step 3: Refactor form initialization without changing save behavior**

Change props:

```ts
interface AnimeFormProps {
  initial?: Partial<AnimeInput> | null;
  suggestedTags?: string[];
  onSave: (data: AnimeInput) => Promise<void>;
  onCancel: () => void;
}
```

Keep optional metadata in local state or a single `metadata` object so submit includes:

```ts
{
  bangumiId: initial?.bangumiId,
  bangumiUrl: initial?.bangumiUrl,
  originalTitle: initial?.originalTitle,
  airDate: initial?.airDate,
}
```

Normalize suggested tags with the same trim/deduplicate behavior as selected tags. Render only suggestions not already selected.

- [ ] **Step 4: Run the form and mapper tests**

Run:

```powershell
npm test -- components/anime-form.test.tsx lib/bangumi/mapper.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit the form enhancement**

```powershell
git add components/anime-form.tsx components/anime-form.test.tsx
git commit -m "feat: add opt-in Bangumi tag suggestions"
```

---

### Task 6: Administrator Search and Prefill Flow

**Files:**
- Create: `components/bangumi-search.tsx`
- Create: `components/bangumi-search.test.tsx`
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `BangumiSearchResult`, `BangumiPrefill`, and the two internal routes.
- Produces: `BangumiSearch({ onSelect, onEditExisting })`.
- Preserves: existing create, update, delete, export, logout, and local list filtering.

- [ ] **Step 1: Write failing `BangumiSearch` interaction tests**

Start `components/bangumi-search.test.tsx` with:

```ts
// @vitest-environment jsdom
```

Mock `fetch` by URL. Assert:

- blank search does not issue a request and shows validation;
- Enter submits one trimmed search request;
- loading disables the button;
- eight returned cards render expected titles and metadata;
- selecting a new result fetches detail and calls `onSelect(prefill)`;
- an `alreadyAdded` result calls `onEditExisting(localAnimeId)` without fetching detail;
- search error shows a Chinese message and a manual-entry affordance;
- an in-progress request does not submit twice.

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```powershell
npm test -- components/bangumi-search.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the focused search component**

Use local state:

```ts
const [query, setQuery] = useState("");
const [results, setResults] = useState<BangumiSearchResult[]>([]);
const [loading, setLoading] = useState(false);
const [selectingId, setSelectingId] = useState<number | null>(null);
const [error, setError] = useState("");
```

Props:

```ts
interface BangumiSearchProps {
  onSelect: (prefill: BangumiPrefill) => void;
  onEditExisting: (localAnimeId: string) => void;
  onUseManual: () => void;
}
```

Render semantic buttons and text labels so keyboard and mobile use do not depend on hover.

- [ ] **Step 4: Integrate modes and prefill into `app/admin/page.tsx`**

Add:

```ts
type EntryMode = "bangumi" | "manual";
const [entryMode, setEntryMode] = useState<EntryMode>("bangumi");
const [prefill, setPrefill] = useState<BangumiPrefill | null>(null);
```

Behavior:

- default to Bangumi mode;
- mode buttons never discard a partially filled prefill without explicit user action;
- selecting a result stores `prefill` and displays `AnimeForm`;
- pass `suggestedTags={prefill?.suggestedTags ?? []}`;
- saving or canceling clears prefill;
- editing an existing record clears prefill and uses the existing edit flow;
- `409` responses open the record identified by `existingId` when it exists in the loaded list.

- [ ] **Step 5: Run both component tests and the complete test suite**

Run:

```powershell
npm test -- components/bangumi-search.test.tsx components/anime-form.test.tsx
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the administrator flow**

```powershell
git add components/bangumi-search.tsx components/bangumi-search.test.tsx app/admin/page.tsx
git commit -m "feat: add Bangumi assisted entry flow"
```

---

### Task 7: Configuration, Documentation, and End-to-End Verification

**Files:**
- Modify: `.gitignore`
- Create: `.env.local.example`
- Modify: `README.md`

**Interfaces:**
- Documents: `BANGUMI_USER_AGENT` and optional `BANGUMI_ACCESS_TOKEN`.
- Documents: the search/select/edit/save administrator workflow and manual fallback.

- [ ] **Step 1: Add the safe environment template**

Add this exception after `.env*` in `.gitignore`:

```gitignore
!.env.local.example
```

Create `.env.local.example`:

```dotenv
ADMIN_PASSWORD=replace-with-a-strong-password
BANGUMI_USER_AGENT=your-bangumi-user-id/anime-diary
# Optional but recommended for production:
BANGUMI_ACCESS_TOKEN=
```

Do not copy values from `.env.local`.

- [ ] **Step 2: Update README setup and usage**

Document:

- where to generate a Bangumi Access Token;
- why the User-Agent must identify the project owner;
- that the token is server-only;
- the “search → select → choose tags → edit → save” flow;
- manual-entry fallback;
- local snapshots and duplicate behavior;
- `npm test` and `npm run test:watch`.

- [ ] **Step 3: Run full fresh verification**

Run:

```powershell
npm test
npm run lint
npx tsc --noEmit
npm run build
git diff --check
git status --short
```

Expected:

- all tests PASS;
- lint reports zero errors (the three pre-existing `<img>` warnings may remain);
- TypeScript exits `0`;
- production build exits `0`;
- `git diff --check` exits `0`;
- status contains only the intended documentation changes before the final commit.

- [ ] **Step 4: Commit documentation**

```powershell
git add .gitignore .env.local.example README.md
git commit -m "docs: document Bangumi assisted entry"
```

- [ ] **Step 5: Verify final repository state**

Run:

```powershell
git status --short --branch
git log --oneline -8
```

Expected: clean working tree with the implementation commits visible on the current branch.
