# Component and Security Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify anime input validation, API/client error handling, inline feedback, mutation same-origin protection, and login failure rate limiting.

**Architecture:** Route handlers explicitly call small shared boundary functions. Pure anime validation and HTTP helpers remain independent of Next.js where practical; login limiting uses an injected store contract with Redis and memory implementations; client components share one error reader and one accessible feedback component.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, `@upstash/redis`.

## Global Constraints

- Do not change public read access, authentication Cookie format, anime storage format, backup file format, Bangumi mapping, or admin workspace information architecture.
- Add no package or environment-variable dependency.
- Require an exact same-origin `Origin` header on every listed mutation route.
- Rate-limit a client after five failed logins within 15 minutes; success clears failures.
- Use Redis when the existing Redis configuration is present and memory otherwise.
- Every production behavior change starts with a focused failing test.
- Complete with full tests, TypeScript, ESLint, production build, local `main` merge, and push to `https://github.com/aimi8023/anime-diary.git`.

---

### Task 1: Shared Server HTTP Boundaries

**Files:**

- Create: `lib/http/types.ts`
- Create: `lib/http/response.ts`
- Create: `lib/http/response.test.ts`
- Create: `lib/http/security.ts`
- Create: `lib/http/security.test.ts`
- Modify: `lib/backups/http.ts`
- Modify: `lib/backups/http.test.ts`
- Modify: `app/api/backups/import/preview/route.ts`
- Modify: `app/api/backups/import/preview/route.test.ts`
- Modify: `app/api/backups/import/apply/route.ts`
- Modify: `app/api/backups/import/apply/route.test.ts`
- Modify: `app/api/backups/[id]/restore/route.ts`
- Modify: `app/api/backups/[id]/restore/route.test.ts`

**Interfaces:**

- Produces:

```ts
export interface ApiErrorBody<TIssue = unknown> {
  error: string;
  code?: string;
  issues?: TIssue[];
  existingId?: string;
}

export function errorResponse(
  status: number,
  error: string,
  options?: Omit<ApiErrorBody, "error">,
): NextResponse<ApiErrorBody>;

export async function readJsonBody(
  request: Request,
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse<ApiErrorBody> }
>;

export function sameOriginError(request: Request): NextResponse | null;
```

- Consumers: anime and auth routes in Tasks 2–3; backup HTTP mapping remains compatible.

- [ ] **Step 1: Write failing HTTP response tests**

Create tests proving that `errorResponse(400, "提交失败", { code: "invalid_input", issues })` emits the stable body and that malformed JSON passed to `readJsonBody` returns `400`:

```ts
expect(await response.json()).toEqual({
  error: "请求内容不是有效的 JSON",
  code: "invalid_json",
});
```

- [ ] **Step 2: Run response tests and verify RED**

Run: `npm test -- lib/http/response.test.ts`

Expected: FAIL because `lib/http/response.ts` does not exist.

- [ ] **Step 3: Implement the response types and helpers**

Use `NextResponse.json` for both helpers. `readJsonBody` must catch JSON parsing failures only and return an `invalid_json` response without throwing.

- [ ] **Step 4: Run response tests and verify GREEN**

Run: `npm test -- lib/http/response.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing strict same-origin tests**

Cover literal requests:

```ts
expect(
  sameOriginError(
    new Request("https://anime.example/api/anime", {
      method: "POST",
      headers: { Origin: "https://anime.example" },
    }),
  ),
).toBeNull();
```

Missing, `null`, malformed and `https://evil.example` origins must return `403` with `code: "invalid_origin"`.

- [ ] **Step 6: Run security tests and verify RED**

Run: `npm test -- lib/http/security.test.ts`

Expected: FAIL because the shared helper does not exist.

- [ ] **Step 7: Implement strict same-origin comparison**

Parse `Origin` with `new URL(origin).origin`, reject parse failures and require exact equality with `new URL(request.url).origin`.

- [ ] **Step 8: Run security tests and verify GREEN**

Run: `npm test -- lib/http/security.test.ts`

Expected: PASS.

- [ ] **Step 9: Write backup route regression tests**

For preview and apply, add a foreign-origin case that expects `403 invalid_origin` and no service call. Preserve restore’s existing foreign-origin test and add the error code assertion.

- [ ] **Step 10: Run backup route tests and verify RED**

Run:

```powershell
npm test -- app/api/backups/import/preview/route.test.ts app/api/backups/import/apply/route.test.ts app/api/backups/[id]/restore/route.test.ts
```

Expected: FAIL because existing backup origin errors lack `code`.

- [ ] **Step 11: Migrate backup routes to the shared boundary**

Remove the local implementation from `lib/backups/http.ts`, import or re-export the shared `sameOriginError`, and use `errorResponse` in `backupErrorResponse` while preserving existing `issues` and messages.

- [ ] **Step 12: Run shared and backup tests**

Run:

```powershell
npm test -- lib/http/response.test.ts lib/http/security.test.ts lib/backups/http.test.ts app/api/backups/import/preview/route.test.ts app/api/backups/import/apply/route.test.ts app/api/backups/[id]/restore/route.test.ts
```

Expected: PASS.

- [ ] **Step 13: Commit**

```powershell
git add lib/http lib/backups/http.ts lib/backups/http.test.ts app/api/backups
git commit -m "refactor: centralize mutation HTTP boundaries"
```

---

### Task 2: Shared Anime Input Validation

**Files:**

- Create: `lib/anime/validation.ts`
- Create: `lib/anime/validation.test.ts`
- Modify: `lib/anime-api-error.ts`
- Create: `lib/anime-api-error.test.ts`
- Modify: `app/api/anime/route.ts`
- Modify: `app/api/anime/route.test.ts`
- Modify: `app/api/anime/[id]/route.ts`
- Modify: `app/api/anime/[id]/route.test.ts`

**Interfaces:**

- Consumes: `errorResponse`, `readJsonBody`, `sameOriginError`.
- Produces:

```ts
export interface InputIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: InputIssue[] };

export function parseAnimeCreateInput(
  value: unknown,
): ValidationResult<AnimeInput>;

export function parseAnimeUpdateInput(
  value: unknown,
): ValidationResult<Partial<AnimeInput>>;
```

- [ ] **Step 1: Write failing create validation tests**

Use hand-written inputs to prove trimming and normalization of every supported field. Add separate tests for non-object input, missing title/season, invalid URL, rating outside 1–10 or off the 0.5 step, non-integer episodes, more than 20 tags, invalid Bangumi ID and invalid date.

Example expected issue:

```ts
expect(result).toEqual({
  ok: false,
  issues: [
    {
      path: "rating",
      message: "评分必须是 1–10 之间的 0.5 倍数",
    },
  ],
});
```

- [ ] **Step 2: Run create validation tests and verify RED**

Run: `npm test -- lib/anime/validation.test.ts`

Expected: FAIL because the validator does not exist.

- [ ] **Step 3: Implement create validation**

Build small field parsers inside `lib/anime/validation.ts`; collect all issues rather than stopping at the first. Do not mutate the caller object. Return an `AnimeInput` only when no issue exists.

- [ ] **Step 4: Run create validation tests and verify GREEN**

Run: `npm test -- lib/anime/validation.test.ts`

Expected: create cases PASS.

- [ ] **Step 5: Write failing update validation tests**

Prove that an empty update fails, omitted fields remain absent, empty optional metadata becomes `undefined`, and present invalid fields use the same rules as create.

- [ ] **Step 6: Run update tests and verify RED**

Run: `npm test -- lib/anime/validation.test.ts`

Expected: FAIL on the new update behavior.

- [ ] **Step 7: Implement partial update validation**

Use the same field parsers and only include recognized fields present on the input object. Return an issue at path `"$"` when no supported field is present.

- [ ] **Step 8: Run validator tests and verify GREEN**

Run: `npm test -- lib/anime/validation.test.ts`

Expected: PASS.

- [ ] **Step 9: Write failing anime route boundary tests**

Update all successful requests with `Origin: "http://localhost"`. Add:

- foreign and missing Origin return `403 invalid_origin`;
- malformed JSON returns `400 invalid_json`;
- invalid input returns `400 invalid_input` with issues;
- storage is not called for rejected input;
- normalized create/update data is passed to storage.

- [ ] **Step 10: Run anime route tests and verify RED**

Run:

```powershell
npm test -- app/api/anime/route.test.ts app/api/anime/[id]/route.test.ts
```

Expected: FAIL because routes do not call the shared boundaries.

- [ ] **Step 11: Replace duplicated route normalization**

The POST flow becomes:

```ts
const originError = sameOriginError(request);
if (originError) return originError;
const parsedBody = await readJsonBody(request);
if (!parsedBody.ok) return parsedBody.response;
const parsedInput = parseAnimeCreateInput(parsedBody.data);
if (!parsedInput.ok) {
  return errorResponse(400, "提交的数据不符合要求", {
    code: "invalid_input",
    issues: parsedInput.issues,
  });
}
```

Use `parsedInput.data` to construct the stored record. PUT follows the same structure with `parseAnimeUpdateInput`; DELETE checks origin before storage.

- [ ] **Step 12: Add stable anime domain error codes**

Write `lib/anime-api-error.test.ts` first, then update `animeMutationErrorResponse` so duplicate and revision conflicts preserve messages while adding `code: "duplicate_bangumi"` and `code: "revision_conflict"`.

- [ ] **Step 13: Run anime boundary tests**

Run:

```powershell
npm test -- lib/anime/validation.test.ts lib/anime-api-error.test.ts app/api/anime/route.test.ts app/api/anime/[id]/route.test.ts
```

Expected: PASS.

- [ ] **Step 14: Commit**

```powershell
git add lib/anime lib/anime-api-error.ts lib/anime-api-error.test.ts app/api/anime
git commit -m "feat: validate anime mutations consistently"
```

---

### Task 3: Login Failure Rate Limiting

**Files:**

- Create: `lib/auth/rate-limit.ts`
- Create: `lib/auth/rate-limit.test.ts`
- Create: `app/api/auth/route.test.ts`
- Modify: `app/api/auth/route.ts`
- Modify: `proxy.ts`
- Create: `proxy.test.ts`

**Interfaces:**

- Consumes: `errorResponse`, `readJsonBody`, `sameOriginError`.
- Produces:

```ts
export interface RateLimitState {
  failures: number;
  retryAfter: number;
  limited: boolean;
}

export interface LoginRateLimiter {
  check(key: string): Promise<RateLimitState>;
  recordFailure(key: string): Promise<RateLimitState>;
  reset(key: string): Promise<void>;
}

export function loginClientKey(request: Request): string;
export function createMemoryLoginRateLimiter(options?: {
  now?: () => number;
}): LoginRateLimiter;
export function createRedisLoginRateLimiter(redis: Redis): LoginRateLimiter;
export const loginRateLimiter: LoginRateLimiter;
```

- [ ] **Step 1: Write failing client-key and memory limiter tests**

Prove that:

- the first forwarded IP is selected and hashed;
- no plaintext IP appears in the key;
- failures 1–5 are not pre-blocked;
- a later `check` is limited;
- `retryAfter` decreases with an injected clock;
- `reset` clears the bucket;
- expired buckets start over.

- [ ] **Step 2: Run memory limiter tests and verify RED**

Run: `npm test -- lib/auth/rate-limit.test.ts`

Expected: FAIL because the limiter does not exist.

- [ ] **Step 3: Implement the memory limiter**

Use constants `WINDOW_SECONDS = 900` and `MAX_FAILURES = 5`. Store `{ failures, expiresAt }` in a module-private Map. `recordFailure` returns the state after increment; `check` returns limited only when existing failures are at least five.

- [ ] **Step 4: Run memory limiter tests and verify GREEN**

Run: `npm test -- lib/auth/rate-limit.test.ts`

Expected: memory cases PASS.

- [ ] **Step 5: Write failing Redis adapter tests**

Inject an object exposing `eval`. Assert consumer-visible states for literal Redis results `[5, 840]` and verify `reset` calls `del` for the hashed bucket. Do not assert Lua source text.

- [ ] **Step 6: Run Redis tests and verify RED**

Run: `npm test -- lib/auth/rate-limit.test.ts`

Expected: FAIL because the Redis adapter is absent.

- [ ] **Step 7: Implement Redis limiter and environment factory**

Use atomic Lua for check/increment plus TTL, and the existing Upstash URL/token aliases. If both URL and token are present, instantiate Redis; otherwise create the memory limiter. Do not perform a network request at module initialization.

- [ ] **Step 8: Run rate limiter tests and verify GREEN**

Run: `npm test -- lib/auth/rate-limit.test.ts`

Expected: PASS.

- [ ] **Step 9: Write failing auth route tests**

Mock only the limiter boundary and cover:

- foreign or missing Origin returns `403`;
- malformed JSON and non-string password record a failure;
- wrong password records a failure and returns `401`;
- a pre-limited client returns `429 rate_limited` plus `Retry-After`;
- successful login resets the bucket and preserves the existing Cookie attributes;
- missing `ADMIN_PASSWORD` returns `500` without recording a failure;
- DELETE requires same origin and clears the existing Cookie.

- [ ] **Step 10: Run auth tests and verify RED**

Run: `npm test -- app/api/auth/route.test.ts`

Expected: FAIL because auth has no origin check or limiter.

- [ ] **Step 11: Implement the auth route flow**

Check origin first, configuration second, limiter third, then parse and compare the password. Preserve SHA-256 Cookie token generation and existing attributes.

- [ ] **Step 12: Run auth tests and verify GREEN**

Run: `npm test -- app/api/auth/route.test.ts`

Expected: PASS.

- [ ] **Step 13: Write proxy error-shape tests**

Use `NextRequest` to verify protected API requests return `code: "unauthenticated"` and missing configuration returns `code: "auth_not_configured"`, while public `GET /api/anime` remains allowed.

- [ ] **Step 14: Run proxy tests and verify RED**

Run: `npm test -- proxy.test.ts`

Expected: FAIL because proxy errors lack stable codes.

- [ ] **Step 15: Update proxy error responses**

Use the shared `errorResponse` helper without changing route matching, redirects, token comparison or public access.

- [ ] **Step 16: Run auth and proxy tests**

Run:

```powershell
npm test -- lib/auth/rate-limit.test.ts app/api/auth/route.test.ts proxy.test.ts
```

Expected: PASS.

- [ ] **Step 17: Commit**

```powershell
git add lib/auth app/api/auth proxy.ts proxy.test.ts
git commit -m "feat: protect login with shared security boundaries"
```

---

### Task 4: Shared Client Errors and Inline Feedback

**Files:**

- Create: `lib/http/client.ts`
- Create: `lib/http/client.test.ts`
- Create: `components/feedback/inline-feedback.tsx`
- Create: `components/feedback/inline-feedback.test.tsx`
- Modify: `app/login/page.tsx`
- Create: `app/login/page.test.tsx`
- Modify: `components/anime-form.tsx`
- Modify: `components/anime-form.test.tsx`
- Modify: `components/bangumi-search.tsx`
- Modify: `components/bangumi-search.test.tsx`
- Modify: `components/backup-manager.tsx`
- Modify: `components/backup-manager.test.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/page.test.tsx`

**Interfaces:**

- Consumes: `ApiErrorBody`.
- Produces:

```ts
export async function readApiError(
  response: Response,
  fallback: string,
): Promise<string>;

export interface InlineFeedbackProps {
  tone: "error" | "success";
  children: React.ReactNode;
  className?: string;
}
```

- [ ] **Step 1: Write failing client error tests**

Cover a JSON error message, empty error field, HTML response and invalid JSON. Expected fallback must be a literal supplied by the test.

- [ ] **Step 2: Run client helper tests and verify RED**

Run: `npm test -- lib/http/client.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement safe client error reading**

Check `Content-Type` for JSON, catch parsing errors and only accept a non-empty string `error`; otherwise return the fallback.

- [ ] **Step 4: Run client helper tests and verify GREEN**

Run: `npm test -- lib/http/client.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing feedback component tests**

Prove error renders `role="alert"`, success renders `role="status"` and caller classes are retained.

- [ ] **Step 6: Run feedback tests and verify RED**

Run: `npm test -- components/feedback/inline-feedback.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 7: Implement the feedback component**

Keep one shared base class and tone-specific classes. Do not introduce theme tokens in this phase.

- [ ] **Step 8: Run feedback tests and verify GREEN**

Run: `npm test -- components/feedback/inline-feedback.test.tsx`

Expected: PASS.

- [ ] **Step 9: Write failing login and admin feedback tests**

Login test: a `429` response displays the server message in an alert and re-enables submit.

Admin test: a DELETE error response displays a row-level workspace alert and does not invoke `window.alert`.

- [ ] **Step 10: Run page tests and verify RED**

Run:

```powershell
npm test -- app/login/page.test.tsx app/admin/page.test.tsx
```

Expected: FAIL because pages still use local parsing and blocking alert.

- [ ] **Step 11: Migrate login and admin page feedback**

Use `readApiError` for error responses. Add admin `operationError` state, clear it before mutations, and render `InlineFeedback` above the list. Keep successful navigation and CRUD behavior.

- [ ] **Step 12: Run page tests and verify GREEN**

Run:

```powershell
npm test -- app/login/page.test.tsx app/admin/page.test.tsx
```

Expected: PASS.

- [ ] **Step 13: Write or update component feedback tests**

For AnimeForm, BangumiSearch and BackupManager, assert error UI uses `role="alert"` and backup success uses `role="status"`. Existing request behavior remains unchanged.

- [ ] **Step 14: Run component tests and verify RED**

Run:

```powershell
npm test -- components/anime-form.test.tsx components/bangumi-search.test.tsx components/backup-manager.test.tsx
```

Expected: at least one new semantic assertion FAILS.

- [ ] **Step 15: Migrate remaining components**

Replace duplicated error containers with `InlineFeedback` and duplicated response parsing with `readApiError`. Preserve loading, retry, manual fallback, import and restore behavior.

- [ ] **Step 16: Run all focused client tests**

Run:

```powershell
npm test -- lib/http/client.test.ts components/feedback/inline-feedback.test.tsx app/login/page.test.tsx app/admin/page.test.tsx components/anime-form.test.tsx components/bangumi-search.test.tsx components/backup-manager.test.tsx
```

Expected: PASS.

- [ ] **Step 17: Commit**

```powershell
git add lib/http/client.ts lib/http/client.test.ts components/feedback app/login app/admin components/anime-form.tsx components/anime-form.test.tsx components/bangumi-search.tsx components/bangumi-search.test.tsx components/backup-manager.tsx components/backup-manager.test.tsx
git commit -m "refactor: unify client feedback states"
```

---

### Task 5: Documentation, Full Verification and Integration

**Files:**

- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `.env.local.example` only if explanatory comments are required; do not add a variable.
- Modify: `docs/superpowers/plans/2026-07-30-component-security-boundaries.md`

**Interfaces:** None.

- [ ] **Step 1: Update documentation**

Document strict same-origin writes, the error envelope, anime input validation and the 5-failure/15-minute limiter. State that production should configure existing Redis variables for cross-instance limiting and that memory fallback is single-instance.

- [ ] **Step 2: Mark completed plan checkboxes**

Keep any blocked item unchecked with an exact reason. Do not claim browser verification if the in-app browser still rejects local addresses.

- [ ] **Step 3: Run all tests**

Run: `npm test`

Expected: all test files PASS with zero failures.

- [ ] **Step 4: Run static verification**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

Expected: TypeScript exits 0; ESLint has zero errors. Existing `<img>` warnings may remain.

- [ ] **Step 5: Run production build**

Run: `npm run build`

Expected: optimized production build exits 0. If Google Fonts is blocked by the sandbox, rerun the same command with approved network access.

- [ ] **Step 6: Review the final diff against the specification**

Check:

- every listed mutation route invokes `sameOriginError`;
- only shared anime validators normalize create/update input;
- every new error body retains `error`;
- rate-limit success resets failures and `429` includes `Retry-After`;
- no plaintext IP, password or token is logged or stored;
- public GET and existing backup/Bangumi behavior remain compatible.

- [ ] **Step 7: Commit documentation**

```powershell
git add README.md CLAUDE.md .env.local.example docs/superpowers/plans/2026-07-30-component-security-boundaries.md
git commit -m "docs: document security boundaries"
```

- [ ] **Step 8: Merge and verify on main**

Fast-forward `codex/component-security-boundaries` into local `main`, then run:

```powershell
npm test
npx tsc --noEmit
git diff origin/main..HEAD --check
```

Expected: all commands exit 0.

- [ ] **Step 9: Push the authorized main branch**

```powershell
git push https://github.com/aimi8023/anime-diary.git main:main
```

Expected: remote `main` advances to the local verified commit.
