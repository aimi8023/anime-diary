# Versioned Backup and Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic pre-write snapshots, bounded version history, validated JSON import/export, diff preview, and reversible restore to Anime Diary.

**Architecture:** Move all record mutations through a common versioned storage core backed by Redis or local JSON adapters. Each adapter exposes compare-and-set commit semantics that save the previous state before replacing it; a backup service handles file validation, diffing, export, and restore, while admin-only API routes and a focused UI component expose those operations.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, `@upstash/redis` 1.38, Vitest 4, Testing Library, Node filesystem APIs.

## Global Constraints

- Preserve public read-only access to `GET /api/anime`; all backup routes remain administrator-only.
- Create a snapshot before every add, update, delete, import, and restore.
- Keep the newest 30 snapshots; cleanup failure may retain extras but must not invalidate a successful write.
- Import replaces the full dataset and accepts both legacy `Anime[]` and schema-versioned backup files.
- Limit imports to 5 MB and validate all records again on the server when applying.
- Treat storage corruption and connection failures as errors, never as an empty dataset.
- Use optimistic revision checks with at most three mutation attempts.
- Do not add an external backup provider, cron job, merge import, field-level history, or multi-user support.
- Keep existing Redis and Vercel environment variables; add no required production configuration.

---

### Task 1: Backup Types, File Validation, and Dataset Diff

**Files:**
- Create: `lib/backups/types.ts`
- Create: `lib/backups/validation.ts`
- Create: `lib/backups/validation.test.ts`
- Create: `lib/backups/diff.ts`
- Create: `lib/backups/diff.test.ts`

**Interfaces:**
- Produces:
  - `BackupReason`
  - `AnimeState`
  - `BackupMetadata`
  - `BackupSnapshot`
  - `AnimeBackupFile`
  - `DatasetDiff`
  - `parseBackupJson(raw: string): BackupParseResult`
  - `diffAnimeData(current: Anime[], target: Anime[]): DatasetDiff`
  - `createBackupFile(data: Anime[], options): AnimeBackupFile`

- [ ] **Step 1: Write failing validation tests**

Cover the legacy array format, the versioned wrapper, malformed JSON, unsupported versions, duplicate IDs, duplicate positive `bangumiId` values, invalid rating/date/tags, and empty arrays:

```ts
it("accepts a legacy anime array", () => {
  const result = parseBackupJson(JSON.stringify([anime]));
  expect(result).toEqual({ ok: true, data: [anime], warnings: [] });
});

it("rejects duplicate Bangumi ids without returning importable data", () => {
  const result = parseBackupJson(JSON.stringify([
    anime,
    { ...anime, id: "second-id" },
  ]));
  expect(result.ok).toBe(false);
  expect(result.issues).toContainEqual(expect.objectContaining({
    code: "duplicate_bangumi_id",
    recordIndex: 1,
  }));
});
```

- [ ] **Step 2: Run validation tests and verify RED**

Run: `npm test -- lib/backups/validation.test.ts`

Expected: FAIL because `parseBackupJson` and backup types do not exist.

- [ ] **Step 3: Implement backup types and strict parser**

Use discriminated results so invalid input cannot expose `data`:

```ts
export type BackupParseResult =
  | { ok: true; data: Anime[]; warnings: BackupIssue[] }
  | { ok: false; issues: BackupIssue[] };

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export function parseBackupJson(raw: string): BackupParseResult {
  // JSON.parse, unwrap legacy/new format, validate every field,
  // collect duplicate IDs and bangumiIds, then clone normalized data.
}
```

Do not silently clamp imported ratings or episodes. Imported data must already satisfy the same persisted invariants as application-created records.

- [ ] **Step 4: Run validation tests and verify GREEN**

Run: `npm test -- lib/backups/validation.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing diff and export-format tests**

```ts
it("counts added, removed, changed and unchanged records by id", () => {
  expect(diffAnimeData(current, target)).toMatchObject({
    added: 1,
    removed: 1,
    changed: 1,
    unchanged: 1,
  });
});

it("creates a versioned file without secret configuration", () => {
  const file = createBackupFile([anime], { source: "current" });
  expect(file.format).toBe("anime-diary-backup");
  expect(file.schemaVersion).toBe(1);
  expect(file.data).toEqual([anime]);
  expect(JSON.stringify(file)).not.toContain("token");
});
```

- [ ] **Step 6: Run diff tests and verify RED**

Run: `npm test -- lib/backups/diff.test.ts`

Expected: FAIL because diff and export helpers do not exist.

- [ ] **Step 7: Implement canonical comparison and export helper**

Compare all persisted `Anime` fields after sorting object keys and tags consistently, but do not mutate caller arrays. Return up to five representative titles for each changed category.

- [ ] **Step 8: Run task tests and commit**

Run: `npm test -- lib/backups/validation.test.ts lib/backups/diff.test.ts`

Expected: PASS.

Commit:

```bash
git add lib/backups
git commit -m "feat: add backup validation and diff helpers"
```

---

### Task 2: Versioned Storage Core

**Files:**
- Modify: `lib/storage.ts`
- Create: `lib/storage-core.ts`
- Create: `lib/storage-core.test.ts`
- Modify: `lib/types.ts`

**Interfaces:**
- Consumes: Task 1 backup types.
- Produces:
  - `VersionedStorageAdapter`
  - `CommitInput`
  - `CommitResult`
  - `createVersionedStorage(adapter, options?): Storage`
  - `Storage.getState()`
  - `Storage.listBackups()`
  - `Storage.getBackup(id)`
  - `Storage.replaceAll(data, reason)`
  - `Storage.restore(id)`
  - `DuplicateBangumiError`
  - `RevisionConflictError`

- [ ] **Step 1: Write failing core behavior tests using an in-memory adapter**

The fake adapter must emulate revision conflicts and record commit inputs. Test:

```ts
it("snapshots the latest state before add", async () => {
  const storage = createVersionedStorage(adapter);
  await storage.add(newAnime);
  expect(adapter.commits[0]).toMatchObject({
    expectedRevision: 0,
    reason: "add",
    nextData: [newAnime],
  });
});

it("re-reads and reapplies a mutation after one revision conflict", async () => {
  adapter.conflictsRemaining = 1;
  await storage.remove("anime-1");
  expect(adapter.readCount).toBe(2);
  expect(adapter.commits).toHaveLength(2);
});

it("throws after three revision conflicts", async () => {
  adapter.conflictsRemaining = 3;
  await expect(storage.remove("anime-1")).rejects.toBeInstanceOf(
    RevisionConflictError,
  );
});
```

Also verify that duplicate Bangumi detection occurs inside the latest-state mutation for add and update, not only in route prechecks.

- [ ] **Step 2: Run the core tests and verify RED**

Run: `npm test -- lib/storage-core.test.ts`

Expected: FAIL because the versioned adapter and core do not exist.

- [ ] **Step 3: Define the adapter and expanded storage contracts**

```ts
export interface VersionedStorageAdapter {
  readState(): Promise<AnimeState>;
  commit(input: CommitInput): Promise<CommitResult>;
  listBackups(): Promise<BackupMetadata[]>;
  getBackup(id: string): Promise<BackupSnapshot | null>;
  prune(keep: number): Promise<void>;
}

export interface Storage {
  getAll(): Promise<Anime[]>;
  getState(): Promise<AnimeState>;
  findByBangumiId(id: number): Promise<Anime | null>;
  add(anime: Anime): Promise<void>;
  update(id: string, data: Partial<AnimeInput>): Promise<void>;
  remove(id: string): Promise<void>;
  listBackups(): Promise<BackupMetadata[]>;
  getBackup(id: string): Promise<BackupSnapshot | null>;
  replaceAll(data: Anime[], reason: "import"): Promise<AnimeState>;
  restore(id: string): Promise<AnimeState>;
}
```

`CommitInput` contains the expected revision, next dataset, reason, server-generated snapshot ID, and timestamp. `commit` returns `{ committed: false }` for revision mismatch and `{ committed: true, state }` for success.

- [ ] **Step 4: Implement the retrying versioned core**

Use a single internal helper:

```ts
async function mutate(
  reason: BackupReason,
  transform: (current: Anime[]) => Anime[],
): Promise<AnimeState> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await adapter.readState();
    const nextData = transform(structuredClone(current.data));
    const result = await adapter.commit(/* expected revision + snapshot */);
    if (result.committed) {
      await pruneBestEffort();
      return result.state;
    }
  }
  throw new RevisionConflictError();
}
```

Generate a fresh snapshot ID and timestamp for each commit attempt. Only call pruning after a successful commit; log cleanup failure without converting the successful mutation into an error.

- [ ] **Step 5: Run core tests and verify GREEN**

Run: `npm test -- lib/storage-core.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/storage.ts lib/storage-core.ts lib/storage-core.test.ts lib/types.ts
git commit -m "feat: add versioned storage mutation core"
```

---

### Task 3: Local JSON Versioned Adapter

**Files:**
- Rewrite: `lib/storage-json.ts`
- Create: `lib/storage-json.test.ts`

**Interfaces:**
- Consumes: `VersionedStorageAdapter` from Task 2.
- Produces:
  - `createJsonStorage(options?: { dataFile?: string; backupDir?: string; revisionFile?: string }): Storage`
  - existing singleton `jsonStorage`

- [ ] **Step 1: Write failing filesystem adapter tests**

Create a unique temporary directory per test and clean it with Node test hooks. Verify:

```ts
it("writes the previous state to backups before replacing current data", async () => {
  const storage = createJsonStorage(paths);
  await storage.add(newAnime);
  const backups = await storage.listBackups();
  expect(backups).toHaveLength(1);
  expect((await storage.getBackup(backups[0].id))?.data).toEqual(initialData);
});

it("throws on malformed current JSON instead of returning an empty list", async () => {
  await fs.writeFile(paths.dataFile, "{broken", "utf8");
  await expect(storage.getAll()).rejects.toThrow("当前数据文件损坏");
});
```

Also test update, delete, import, restore reversibility, 30-version pruning, parallel `Promise.all` writes, missing legacy revision metadata, and failed temp-file replacement preserving the previous current file.

- [ ] **Step 2: Run JSON tests and verify RED**

Run: `npm test -- lib/storage-json.test.ts`

Expected: FAIL because the factory and versioned semantics do not exist.

- [ ] **Step 3: Implement the JSON adapter**

Use:

- a module-local promise queue per resolved data-file path;
- `data/anime.revision.json` for the local revision;
- `data/backups/index.json` for metadata;
- `data/backups/{id}.json` for full snapshots;
- temp files in the same directory followed by `rename`.

Resolve and verify every generated path remains inside the configured data/backup directory. Never derive a path directly from a request parameter.

- [ ] **Step 4: Run JSON tests and verify GREEN**

Run: `npm test -- lib/storage-json.test.ts`

Expected: PASS.

- [ ] **Step 5: Run existing API tests for compatibility**

Run: `npm test -- app/api/anime/route.test.ts app/api/anime/[id]/route.test.ts`

Expected: Existing route tests may fail only where mocks need the new storage behavior; do not change route expectations until Task 5.

- [ ] **Step 6: Commit**

```bash
git add lib/storage-json.ts lib/storage-json.test.ts
git commit -m "feat: add local versioned backup storage"
```

---

### Task 4: Atomic Upstash Redis Adapter

**Files:**
- Rewrite: `lib/storage-kv.ts`
- Create: `lib/storage-kv.test.ts`

**Interfaces:**
- Consumes: Task 2 adapter contract and Task 1 backup types.
- Produces:
  - `createKvStorage(redis: Redis): Storage`
  - existing singleton `kvStorage`
  - exported Redis key constants only when required by tests

- [ ] **Step 1: Write failing Redis adapter tests with a command-level fake**

Test the observable contract rather than private helpers:

```ts
it("uses one conditional script to snapshot and replace state", async () => {
  redis.eval.mockResolvedValueOnce(JSON.stringify({
    committed: true,
    revision: 2,
  }));
  await storage.add(newAnime);
  expect(redis.eval).toHaveBeenCalledTimes(1);
  expect(redis.eval.mock.calls[0][1]).toContain("anime:state");
});

it("maps a script revision mismatch to a retry", async () => {
  redis.eval
    .mockResolvedValueOnce(JSON.stringify({ committed: false }))
    .mockResolvedValueOnce(JSON.stringify({ committed: true, revision: 2 }));
  await storage.remove("anime-1");
  expect(redis.eval).toHaveBeenCalledTimes(2);
});
```

Also verify legacy `anime:all` fallback, malformed state rejection, metadata-only listing, snapshot download, and orphan-safe idempotent pruning.

- [ ] **Step 2: Run Redis tests and verify RED**

Run: `npm test -- lib/storage-kv.test.ts`

Expected: FAIL because the injectable factory and atomic implementation do not exist.

- [ ] **Step 3: Implement Redis state reads and Lua commit**

The script must:

1. read `anime:state`, or construct revision 0 from legacy `anime:all`;
2. compare the stored revision to `ARGV[1]`;
3. return `committed = false` without writes on mismatch;
4. write `anime:backup:{id}` and `anime:backup:metadata`;
5. add the ID to `anime:backups`;
6. set one serialized `AnimeState` value at `anime:state`;
7. return the committed revision.

All JSON payloads are prepared and validated in TypeScript before `EVAL`; the script must never interpolate record content into Lua source.

- [ ] **Step 4: Implement best-effort pruning**

Read IDs beyond the newest 30, then delete snapshot bodies, metadata fields, and sorted-set entries in an idempotent transaction. A cleanup error is logged and retried by a later successful mutation.

- [ ] **Step 5: Run Redis and core tests**

Run: `npm test -- lib/storage-kv.test.ts lib/storage-core.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/storage-kv.ts lib/storage-kv.test.ts
git commit -m "feat: add atomic Redis snapshot storage"
```

---

### Task 5: Backup Service and Admin API

**Files:**
- Create: `lib/backups/service.ts`
- Create: `lib/backups/service.test.ts`
- Create: `app/api/backups/route.ts`
- Create: `app/api/backups/route.test.ts`
- Create: `app/api/backups/[id]/route.ts`
- Create: `app/api/backups/[id]/route.test.ts`
- Create: `app/api/backups/[id]/restore/route.ts`
- Create: `app/api/backups/[id]/restore/route.test.ts`
- Create: `app/api/backups/import/preview/route.ts`
- Create: `app/api/backups/import/preview/route.test.ts`
- Create: `app/api/backups/import/apply/route.ts`
- Create: `app/api/backups/import/apply/route.test.ts`
- Create: `app/api/backups/export/route.ts`
- Create: `app/api/backups/export/route.test.ts`
- Modify: `proxy.ts`
- Modify: `proxy.test.ts`

**Interfaces:**
- Consumes: versioned `storage`, validation, diff, and export helpers.
- Produces:
  - `createBackupService(storage)`
  - admin-only HTTP endpoints described by the approved design

- [ ] **Step 1: Write failing service tests**

```ts
it("previews an import without mutating storage", async () => {
  const preview = await service.previewImport(JSON.stringify([targetAnime]));
  expect(preview.diff.added).toBe(1);
  expect(storage.replaceAll).not.toHaveBeenCalled();
});

it("revalidates and snapshots when applying an import", async () => {
  await service.applyImport(JSON.stringify([targetAnime]), {
    confirmEmpty: false,
  });
  expect(storage.replaceAll).toHaveBeenCalledWith([targetAnime], "import");
});
```

Verify empty imports require `confirmEmpty: true`, restore returns target metadata plus new state, and current export reads a fresh server state.

- [ ] **Step 2: Run service tests and verify RED**

Run: `npm test -- lib/backups/service.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the service and verify GREEN**

Run: `npm test -- lib/backups/service.test.ts`

Expected: PASS.

- [ ] **Step 4: Write failing API and proxy tests**

Test status codes and response shapes:

- backup list excludes full `data`;
- missing snapshot returns `404`;
- restore uses `POST`;
- preview rejects payloads over 5 MB;
- apply rejects invalid JSON and unconfirmed empty arrays;
- export returns `application/json` with an attachment filename;
- modifying requests reject a foreign `Origin`;
- `proxy.config.matcher` contains `/api/backups/:path*`;
- unauthenticated backup access returns `401`.

- [ ] **Step 5: Run API tests and verify RED**

Run:

```bash
npm test -- app/api/backups proxy.test.ts
```

Expected: FAIL because routes and proxy protection do not exist.

- [ ] **Step 6: Implement thin route handlers and same-origin helper**

Keep parsing, validation, and storage rules in the service. Route handlers map:

- invalid input to `400`;
- unauthenticated requests through proxy to `401`;
- missing snapshots to `404`;
- revision conflicts to `409`;
- storage failures to `500`;
- success to documented JSON or download responses.

For modifying routes, compare the parsed request `Origin` to `new URL(request.url).origin`.

- [ ] **Step 7: Run API tests and commit**

Run:

```bash
npm test -- lib/backups/service.test.ts app/api/backups proxy.test.ts
```

Expected: PASS.

Commit:

```bash
git add lib/backups app/api/backups proxy.ts proxy.test.ts
git commit -m "feat: add protected backup and restore APIs"
```

---

### Task 6: Refactor Anime Writes onto Atomic Storage Mutations

**Files:**
- Modify: `app/api/anime/route.ts`
- Modify: `app/api/anime/route.test.ts`
- Modify: `app/api/anime/[id]/route.ts`
- Modify: `app/api/anime/[id]/route.test.ts`

**Interfaces:**
- Consumes: `DuplicateBangumiError`, `RevisionConflictError`, and snapshotting `Storage` methods.
- Produces: unchanged public anime API response shapes, now backed by pre-write snapshots.

- [ ] **Step 1: Extend route tests before changing production routes**

Add expectations that:

- duplicate errors thrown atomically by `storage.add`/`storage.update` map to `409`;
- revision conflicts map to `409`;
- storage errors map to `500`;
- routes no longer rely on a separate `findByBangumiId` result to guarantee uniqueness;
- successful add, update, and delete call exactly one high-level storage mutation.

- [ ] **Step 2: Run route tests and verify RED**

Run:

```bash
npm test -- app/api/anime/route.test.ts app/api/anime/[id]/route.test.ts
```

Expected: FAIL because routes do not map the new domain errors.

- [ ] **Step 3: Refactor routes**

Keep request normalization in route code. Move race-sensitive existence and duplicate checks into the versioned storage core. Preserve current `201`, `200`, `400`, and duplicate `409` response formats so the existing admin page remains compatible.

- [ ] **Step 4: Run all anime and storage tests**

Run:

```bash
npm test -- app/api/anime lib/storage-core.test.ts lib/storage-json.test.ts lib/storage-kv.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/anime
git commit -m "refactor: snapshot all anime mutations"
```

---

### Task 7: Backup and Restore Admin UI

**Files:**
- Create: `components/backup-manager.tsx`
- Create: `components/backup-manager.test.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/page.test.tsx`

**Interfaces:**
- Consumes: Task 5 HTTP APIs.
- Produces:
  - `<BackupManager currentCount onDataChanged />`

- [ ] **Step 1: Write failing component tests**

Use Testing Library to cover:

```tsx
it("shows metadata without loading full snapshot bodies", async () => {
  render(<BackupManager currentCount={2} onDataChanged={vi.fn()} />);
  expect(await screen.findByText("2 个历史版本")).toBeInTheDocument();
  expect(screen.getByText("添加记录")).toBeInTheDocument();
});

it("previews differences before restoring", async () => {
  const user = userEvent.setup();
  render(<BackupManager currentCount={2} onDataChanged={onDataChanged} />);
  await user.click(await screen.findByRole("button", { name: "恢复" }));
  expect(await screen.findByText("将修改 1 条记录")).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalledWith(
    expect.stringContaining("/restore"),
    expect.anything(),
  );
});
```

Also test successful restore refresh, failed restore error text, JSON file preview, invalid import, extra empty import confirmation, apply-import double-submit protection, current export link, and snapshot download.

- [ ] **Step 2: Run component tests and verify RED**

Run: `npm test -- components/backup-manager.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement focused backup manager UI**

The component owns backup loading, preview dialogs, file selection, pending states, and errors. It does not own the anime list. Use the existing glass styling, 44 px minimum touch targets, Chinese copy, and responsive layout.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `npm test -- components/backup-manager.test.tsx`

Expected: PASS.

- [ ] **Step 5: Write failing admin integration test**

Verify that the manager receives the current count and that successful import/restore calls the existing `fetchList` callback.

- [ ] **Step 6: Integrate into the admin page**

Render the manager outside the add/edit form:

```tsx
<BackupManager
  currentCount={animeList.length}
  onDataChanged={fetchList}
/>
```

Replace the old client-memory export button with the service-backed download entry in `BackupManager`.

- [ ] **Step 7: Run admin UI tests and commit**

Run:

```bash
npm test -- components/backup-manager.test.tsx app/admin/page.test.tsx
```

Expected: PASS.

Commit:

```bash
git add components/backup-manager.tsx components/backup-manager.test.tsx app/admin/page.tsx app/admin/page.test.tsx
git commit -m "feat: add backup and restore admin interface"
```

---

### Task 8: Documentation, Migration Regression, and Full Verification

**Files:**
- Modify: `README.md`
- Modify: `.env.local.example` only if comments need clarification; add no new required variable
- Modify: `docs/superpowers/plans/2026-07-29-versioned-backup-restore.md` to check completed steps

**Interfaces:**
- Consumes: all prior tasks.
- Produces: deployable, documented feature with verified backward compatibility.

- [ ] **Step 1: Add a failing legacy-data regression test if not already covered**

Use the exact current `data/anime.json` shape and a Redis `anime:all` legacy array fixture. Verify both load as revision 0 and the first mutation creates a restorable snapshot.

- [ ] **Step 2: Run the regression test and verify RED**

Run:

```bash
npm test -- lib/storage-json.test.ts lib/storage-kv.test.ts
```

Expected: the newly added legacy migration case fails before any required compatibility fix.

- [ ] **Step 3: Implement the minimal compatibility fix and verify GREEN**

Run the same command and expect PASS.

- [ ] **Step 4: Update README**

Document:

- automatic snapshots before every change;
- 30-version retention;
- import, export, preview, and reversible restore;
- same-Upstash failure-domain limitation;
- recommendation to download a baseline after deployment;
- no new required environment variables.

- [ ] **Step 5: Run focused and full automated verification**

Run:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected:

- all tests pass;
- TypeScript exits 0;
- ESLint has 0 errors (existing unrelated `<img>` warnings may remain and must be reported);
- production build exits 0.

- [ ] **Step 6: Inspect the final diff**

Run:

```bash
git status --short
git diff --check
git diff --stat main...
```

Confirm no credentials, generated build output, temporary imports, or backup data files are staged.

- [ ] **Step 7: Commit final documentation**

```bash
git add README.md .env.local.example docs/superpowers/plans/2026-07-29-versioned-backup-restore.md
git commit -m "docs: document backup and restore workflow"
```

- [ ] **Step 8: Request code review and finish the branch**

Use `superpowers:requesting-code-review`, address verified findings, rerun the full verification, then use `superpowers:finishing-a-development-branch` to integrate according to the user's chosen local-main workflow.
