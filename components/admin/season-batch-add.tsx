"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { BroadcastSeason } from "@/lib/bangumi/client";
import { seasonFromAirDate } from "@/lib/bangumi/mapper";
import type { BangumiSearchResult } from "@/lib/bangumi/types";
import CoverImage from "@/components/cover-image";
import InlineFeedback from "@/components/feedback/inline-feedback";
import { readApiError } from "@/lib/http/client";

interface SeasonBatchAddProps {
  onCreated: () => void;
  onGoToUnrated: () => void;
}

interface BatchProgress {
  total: number;
  done: number;
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

type Status = "idle" | "loading" | "ready" | "submitting" | "done";

const SEASONS: BroadcastSeason[] = ["春", "夏", "秋", "冬"];
// 候选列表一次返回最多 144 条，分页展示：
// 每页只挂载 24 张卡片（大屏 8 列正好 3 行），翻页不重新请求，滚动和选中都保持轻量。
const CANDIDATES_PER_PAGE = 24;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: CURRENT_YEAR - 2000 + 1 },
  (_, index) => CURRENT_YEAR - index,
);

function currentSeason(): BroadcastSeason {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return "春";
  if (month <= 6) return "夏";
  if (month <= 9) return "秋";
  return "冬";
}

export default function SeasonBatchAdd({
  onCreated,
  onGoToUnrated,
}: SeasonBatchAddProps) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [season, setSeason] = useState<BroadcastSeason>(currentSeason);
  const [status, setStatus] = useState<Status>("idle");
  const [candidates, setCandidates] = useState<BangumiSearchResult[]>([]);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState("");

  async function fetchCandidates(event: FormEvent) {
    event.preventDefault();
    if (status === "loading" || status === "submitting") return;
    setStatus("loading");
    setError("");
    setProgress(null);
    setSelectedIds(new Set());
    try {
      const response = await fetch(
        `/api/bangumi/season?year=${year}&season=${encodeURIComponent(season)}`,
      );
      if (!response.ok) {
        throw new Error(await readApiError(response, "获取季度列表失败"));
      }
      setCandidates((await response.json()) as BangumiSearchResult[]);
      setPage(1);
      setStatus("ready");
    } catch (fetchError) {
      setCandidates([]);
      setStatus("idle");
      setError(
        fetchError instanceof Error ? fetchError.message : "获取季度列表失败",
      );
    }
  }

  function toggle(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goToPage(next: number) {
    setPage(next);
    const grid = gridRef.current;
    if (grid && typeof grid.scrollIntoView === "function") {
      grid.scrollIntoView({ block: "start" });
    }
  }

  async function submitBatch() {
    const chosen = candidates.filter((candidate) =>
      selectedIds.has(candidate.bangumiId),
    );
    if (chosen.length === 0 || status === "submitting") return;

    setStatus("submitting");
    const next: BatchProgress = {
      total: chosen.length,
      done: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
    setProgress({ ...next });

    for (const candidate of chosen) {
      const body = {
        title: candidate.title,
        originalTitle: candidate.originalTitle,
        season: seasonFromAirDate(candidate.airDate) || `${year}${season}`,
        cover: candidate.cover,
        rating: 0,
        comment: "",
        tags: [],
        episodes: candidate.episodes,
        bangumiId: candidate.bangumiId,
        bangumiUrl: candidate.bangumiUrl,
        ...(candidate.airDate ? { airDate: candidate.airDate } : {}),
      };
      try {
        const response = await fetch("/api/anime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (response.status === 409) {
          next.skipped += 1;
        } else if (!response.ok) {
          next.failed += 1;
          next.errors.push(
            `《${candidate.title}》：${await readApiError(response, "添加失败")}`,
          );
        } else {
          next.created += 1;
        }
      } catch {
        next.failed += 1;
        next.errors.push(`《${candidate.title}》：网络错误`);
      }
      next.done += 1;
      setProgress({ ...next });
    }

    setStatus("done");
    onCreated();
  }

  const submitting = status === "submitting";
  const totalPages = Math.max(
    1,
    Math.ceil(candidates.length / CANDIDATES_PER_PAGE),
  );
  const safePage = Math.min(page, totalPages);
  const visibleCandidates = candidates.slice(
    (safePage - 1) * CANDIDATES_PER_PAGE,
    safePage * CANDIDATES_PER_PAGE,
  );

  return (
    <div className="space-y-5">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={fetchCandidates}
      >
        <div>
          <label
            className="mb-2 block text-[11px] font-bold tracking-[0.08em] text-[var(--ink-muted)]"
            htmlFor="season-batch-year"
          >
            年份
          </label>
          <select
            className="ui-field h-11 w-full px-3 text-sm sm:w-28"
            disabled={submitting}
            id="season-batch-year"
            onChange={(event) => setYear(Number(event.target.value))}
            value={year}
          >
            {YEARS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="mb-2 block text-[11px] font-bold tracking-[0.08em] text-[var(--ink-muted)]">
            季度
          </span>
          <div
            className="flex gap-1 rounded-full border border-white/80 bg-white/55 p-1"
            role="group"
            aria-label="季度"
          >
            {SEASONS.map((option) => {
              const active = season === option;
              return (
                <button
                  aria-pressed={active}
                  className={`min-h-9 rounded-full px-3.5 text-xs font-bold transition-colors ${
                    active
                      ? "bg-white text-[var(--accent-strong)] shadow-sm"
                      : "text-[var(--ink-muted)] hover:bg-white/70"
                  }`}
                  disabled={submitting}
                  key={option}
                  onClick={() => setSeason(option)}
                  type="button"
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
        <button
          className="ui-button ui-button-primary rounded-xl"
          disabled={status === "loading" || submitting}
          type="submit"
        >
          {status === "loading" ? "获取中..." : "获取季度列表"}
        </button>
      </form>

      {error && <InlineFeedback tone="error">{error}</InlineFeedback>}

      {status === "ready" && candidates.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[rgba(91,83,112,0.18)] bg-white/35 py-8 text-center text-sm text-[var(--ink-muted)]">
          该季度没有获取到动画条目，换个年份或季度试试。
        </p>
      )}

      {candidates.length > 0 && (
        <>
          <div
            className="grid scroll-mt-20 grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-2.5 md:grid-cols-6 lg:grid-cols-8"
            ref={gridRef}
          >
            {visibleCandidates.map((candidate) => {
              const selected = selectedIds.has(candidate.bangumiId);
              return (
                <label
                  className={`relative flex flex-col overflow-hidden rounded-xl border p-1 transition-colors focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-pink-300 ${
                    candidate.alreadyAdded
                      ? "border-white/60 bg-white/30 opacity-60"
                      : selected
                        ? "cursor-pointer border-[rgba(219,79,135,0.45)] bg-[var(--accent-soft)]"
                        : "cursor-pointer border-white/70 bg-white/42 hover:bg-white/66"
                  }`}
                  key={candidate.bangumiId}
                >
                  <input
                    checked={selected}
                    className="sr-only"
                    disabled={candidate.alreadyAdded || submitting}
                    onChange={() => toggle(candidate.bangumiId)}
                    type="checkbox"
                  />
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-white/70 bg-white/35">
                    {candidate.cover || candidate.coverThumb ? (
                      <CoverImage
                        alt=""
                        className="object-cover"
                        fallbackLabel={candidate.title}
                        sizes="(max-width: 639px) 30vw, (max-width: 767px) 18vw, (max-width: 1023px) 15vw, 12vw"
                        src={candidate.coverThumb || candidate.cover}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--ink-subtle)]">
                        无图
                      </div>
                    )}
                    {candidate.alreadyAdded && (
                      <span className="absolute left-1 top-1 rounded-full bg-[var(--info-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--info)]">
                        已收录
                      </span>
                    )}
                    {selected && !candidate.alreadyAdded && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-[var(--accent-strong)] text-[10px] font-black text-white"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-1.5 line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-[var(--ink)]"
                    title={candidate.title}
                  >
                    {candidate.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--ink-subtle)]">
                    {candidate.airDate || "日期未知"}
                  </p>
                </label>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <button
                className="ui-button ui-button-secondary"
                disabled={safePage <= 1 || submitting}
                onClick={() => goToPage(safePage - 1)}
                type="button"
              >
                上一页
              </button>
              <p className="text-xs font-bold text-[var(--ink-muted)]">
                {`第 ${safePage} / ${totalPages} 页`}
              </p>
              <button
                className="ui-button ui-button-secondary"
                disabled={safePage >= totalPages || submitting}
                onClick={() => goToPage(safePage + 1)}
                type="button"
              >
                下一页
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="ui-button ui-button-primary"
              disabled={selectedIds.size === 0 || submitting}
              onClick={() => void submitBatch()}
              type="button"
            >
              {submitting
                ? `入库中 ${progress?.done ?? 0}/${progress?.total ?? 0}...`
                : `入库所选 ${selectedIds.size} 部`}
            </button>
            {submitting && (
              <p className="text-xs text-[var(--ink-muted)]">
                正在逐部创建记录，请勿离开。
              </p>
            )}
          </div>
        </>
      )}

      {status === "done" && progress && (
        <div className="space-y-3">
          <InlineFeedback tone={progress.failed > 0 ? "error" : "success"}>
            {`入库完成：新增 ${progress.created} 部，跳过重复 ${progress.skipped} 部，失败 ${progress.failed} 部。`}
          </InlineFeedback>
          {progress.errors.length > 0 && (
            <ul className="list-inside list-disc space-y-1 text-xs text-[var(--danger)]">
              {progress.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          {progress.created > 0 && (
            <button
              className="ui-button ui-button-secondary"
              onClick={onGoToUnrated}
              type="button"
            >
              前往记录补评分
            </button>
          )}
        </div>
      )}
    </div>
  );
}
