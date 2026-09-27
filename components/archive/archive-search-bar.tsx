"use client";

import type {
  ArchiveFilters,
  ArchiveOptions,
} from "@/lib/archive/types";
import { seasonMonthLabel } from "@/lib/season-label";

interface ArchiveSearchBarProps {
  filters: ArchiveFilters;
  options: ArchiveOptions;
  queryDraft: string;
  onQueryChange: (value: string) => void;
  onFilterChange: (patch: Partial<ArchiveFilters>) => void;
}

const seasons: Array<ArchiveFilters["season"]> = ["春", "夏", "秋", "冬"];
const ratings = Array.from({ length: 19 }, (_, index) => 10 - index / 2);

const selectClassName =
  "ui-field h-10 rounded-[var(--radius-pill)] px-3 text-sm font-semibold";

/**
 * 首页内联搜索区：关键词输入 + 年份 / 季度 / 评分筛选。
 * 关键词改动经 ArchiveBrowser 的防抖直接驱动筛选，无需点击搜索按钮。
 */
export default function ArchiveSearchBar({
  filters,
  options,
  queryDraft,
  onQueryChange,
  onFilterChange,
}: ArchiveSearchBarProps) {
  return (
    <section
      aria-label="搜索与筛选"
      className="ui-panel-strong mb-5 px-4 py-4 sm:px-5 sm:py-5"
      role="search"
    >
      <div className="relative">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--ink-subtle)]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m16.25 16.25 4 4" strokeLinecap="round" />
        </svg>
        <input
          aria-label="搜索标题或感想"
          className="archive-search-input ui-field h-12 w-full rounded-[var(--radius-pill)] pl-12 pr-12 text-[15px] font-semibold"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索标题或感想，输入即筛选"
          type="search"
          value={queryDraft}
        />
        {queryDraft && (
          <button
            aria-label="清除关键词"
            className="ui-icon-button absolute right-0.5 top-0.5 h-11 w-11"
            onClick={() => onQueryChange("")}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <label
            className="text-xs font-bold text-[var(--ink-muted)]"
            htmlFor="archive-year"
          >
            年份
          </label>
          <select
            className={selectClassName}
            id="archive-year"
            onChange={(event) => onFilterChange({ year: event.target.value })}
            value={filters.year}
          >
            <option value="">全部</option>
            {options.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div
          aria-label="季度"
          className="flex items-center gap-2"
          role="group"
        >
          <span className="text-xs font-bold text-[var(--ink-muted)]">
            季度
          </span>
          <div className="flex gap-1 rounded-full border border-white/80 bg-white/55 p-1">
            <button
              aria-pressed={filters.season === ""}
              className={`min-h-8 rounded-full px-3 text-xs font-bold transition-colors ${
                filters.season === ""
                  ? "bg-white text-[var(--accent-strong)] shadow-sm"
                  : "text-[var(--ink-muted)] hover:bg-white/70"
              }`}
              onClick={() => onFilterChange({ season: "" })}
              type="button"
            >
              全部
            </button>
            {seasons.map((season) => {
              const active = filters.season === season;
              return (
                <button
                  aria-pressed={active}
                  className={`min-h-8 rounded-full px-3 text-xs font-bold transition-colors ${
                    active
                      ? "bg-white text-[var(--accent-strong)] shadow-sm"
                      : "text-[var(--ink-muted)] hover:bg-white/70"
                  }`}
                  key={season}
                  onClick={() => onFilterChange({ season })}
                  type="button"
                >
                  {seasonMonthLabel(season)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label
            className="text-xs font-bold text-[var(--ink-muted)]"
            htmlFor="archive-rating"
          >
            评分
          </label>
          <select
            className={selectClassName}
            id="archive-rating"
            onChange={(event) =>
              onFilterChange({
                rating: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
            value={filters.rating ?? ""}
          >
            <option value="">不限</option>
            {ratings.map((rating) => (
              <option key={rating} value={rating}>
                {rating} 分及以上
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
