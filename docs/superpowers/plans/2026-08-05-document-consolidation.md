# Document Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace seventeen overlapping Markdown files with three durable project documents and add an owner-friendly Git/Vercel deployment guide.

**Architecture:** `README.md` becomes the operational entry point, `docs/ARCHITECTURE.md` becomes the current technical source of truth, and `docs/DEVELOPMENT-HISTORY.md` preserves the completed development narrative. Detailed historical specs and plans remain recoverable through Git history and are removed from the working tree after their durable information is merged.

**Tech Stack:** Markdown, Git, PowerShell

## Global Constraints

- Do not modify product source, tests, data, assets, or runtime configuration.
- Preserve the owner's uncommitted `components/archive/archive-hero.tsx` change without staging it.
- Do not delete `.env.local`, `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`, or the registered `.worktrees/admin-information-architecture` worktree.
- Do not run product tests; this task changes documentation only.
- Keep deployment commands aligned with the existing `origin` remote, `main` branch, GitHub repository, Vercel automatic deployment, and custom domain.
- Remove the empty untracked `scripts/` directory only after resolving its exact repository-local path.

---

### Task 1: Operational README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: the project entry point for features, setup, operation, contribution, and deployment
- Links to: `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT-HISTORY.md`

- [ ] **Step 1: Consolidate the README structure**

Keep the current project overview, feature list, environment variables, routes, management behavior, backup notes, and test commands. Remove duplicated low-level component commentary that belongs in architecture documentation.

- [ ] **Step 2: Add the owner modification and deployment guide**

Document this exact safe flow:

```powershell
git status
git diff
git add path\to\changed-file
git commit -m "docs: describe the change"
git pull --rebase origin main
git push origin main
```

Explain scoped staging, secret protection, conflict handling, Vercel automatic deployment, GitHub/Vercel status checks, and final confirmation at `https://anime.zhanghome.qzz.io/`. Explicitly warn against `git add .` when unrelated edits exist and against force-pushing `main`.

- [ ] **Step 3: Add durable documentation links**

Add a short “项目文档” section linking only to:

```markdown
- [系统架构](./docs/ARCHITECTURE.md)
- [开发历程](./docs/DEVELOPMENT-HISTORY.md)
```

---

### Task 2: Current Architecture Source of Truth

**Files:**
- Create: `docs/ARCHITECTURE.md`
- Consume before deletion: `CLAUDE.md`, `THEME-CONFIG.md`, `docs/superpowers/specs/*.md`

**Interfaces:**
- Produces: one current-state architecture guide independent of historical specs

- [ ] **Step 1: Write the system overview and directory map**

Describe Next.js App Router boundaries, server-first public reads, client-side archive filtering, admin workspaces, storage selection, and the current component/file map.

- [ ] **Step 2: Merge data and integration architecture**

Record the `Anime` model, JSON/Redis selection, Bangumi search-and-prefill flow, local snapshot principle, duplicate protection, and external-link constraints.

- [ ] **Step 3: Merge backup and security architecture**

Record versioned snapshots, import/export/restore behavior, retention, validation, same-origin write protection, authentication, and rate limiting.

- [ ] **Step 4: Merge UI and theme guidance**

Record the navigation search overlay, dense poster grid, immersive detail layer, admin information architecture, CSS token groups, semantic UI classes, `next/image unoptimized`, responsive breakpoints, focus behavior, and reduced-motion rules.

- [ ] **Step 5: Add maintenance invariants**

State which modules own validation, filtering, HTTP errors, security, storage, backup logic, and UI tokens so future edits do not duplicate responsibilities.

---

### Task 3: Concise Development History

**Files:**
- Create: `docs/DEVELOPMENT-HISTORY.md`
- Consume before deletion: `docs/superpowers/specs/*.md`, `docs/superpowers/plans/*.md`, recent Git log

**Interfaces:**
- Produces: chronological record of completed project phases and representative commits

- [ ] **Step 1: Write the seven-stage timeline**

Cover these phases in order:

1. Bangumi assisted entry;
2. server-first public archive;
3. versioned backup and restore;
4. admin information architecture;
5. shared validation and security boundaries;
6. waterlight visual system;
7. compact navigation search, dense cards, and immersive details.

- [ ] **Step 2: Record outcomes and decisions**

For each phase, include the user problem, delivered behavior, the durable technical decision, and representative commit identifiers where available. Avoid copying implementation checklists or test snippets.

- [ ] **Step 3: Record current status and future candidates**

State that the documented phases are complete on `main`; list external backup copies, richer retrospective views, and observability as optional future projects rather than unfinished work.

---

### Task 4: Remove Superseded Material and Empty Directory

**Files:**
- Delete: `CLAUDE.md`
- Delete: `THEME-CONFIG.md`
- Delete: `docs/superpowers/specs/*.md`
- Delete: `docs/superpowers/plans/*.md`
- Delete locally if still empty: `scripts/`

**Interfaces:**
- Consumes: Tasks 1–3 must already contain all durable information
- Produces: only `README.md`, `docs/ARCHITECTURE.md`, and `docs/DEVELOPMENT-HISTORY.md` as maintained Markdown

- [ ] **Step 1: Delete tracked superseded Markdown with `apply_patch`**

Remove the root instruction/theme files and every old spec/plan, including this transitional design and plan, after their content has been merged.

- [ ] **Step 2: Resolve and remove only the empty `scripts/` directory**

Resolve `F:\projects\My_website\Anime_site\anime-diary\scripts`, confirm it is inside the repository and contains zero entries, then remove that exact empty directory. Do not operate recursively and do not touch `.worktrees/`.

---

### Task 5: Documentation Integrity and Delivery

**Files:**
- Review: `README.md`
- Review: `docs/ARCHITECTURE.md`
- Review: `docs/DEVELOPMENT-HISTORY.md`

**Interfaces:**
- Produces: committed and pushed documentation-only cleanup

- [ ] **Step 1: Review documentation-only scope**

Run:

```powershell
git status --short
git diff --stat
git diff -- README.md docs/ARCHITECTURE.md docs/DEVELOPMENT-HISTORY.md
```

Confirm `components/archive/archive-hero.tsx` remains modified but unstaged and unchanged by this task.

- [ ] **Step 2: Check maintained Markdown references**

Confirm the repository exposes exactly these maintained Markdown files:

```text
README.md
docs/ARCHITECTURE.md
docs/DEVELOPMENT-HISTORY.md
```

Check that local Markdown links in README resolve. Do not run application tests.

- [ ] **Step 3: Commit only documentation cleanup**

```powershell
git add README.md docs/ARCHITECTURE.md docs/DEVELOPMENT-HISTORY.md CLAUDE.md THEME-CONFIG.md docs/superpowers
git commit -m "docs: consolidate project documentation"
```

- [ ] **Step 4: Push `main`**

```powershell
git push origin main
```

Confirm the push includes the design-plan commit and the consolidation commit, while the owner's `archive-hero.tsx` change remains local and unstaged.
