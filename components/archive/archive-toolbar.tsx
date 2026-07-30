"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import type {
  ArchiveFilters,
  ArchiveOptions,
  ArchiveSeason,
  ArchiveSort,
} from "@/lib/archive/types";

interface ArchiveToolbarProps {
  filters: ArchiveFilters;
  options: ArchiveOptions;
  queryDraft: string;
  onQueryChange: (value: string) => void;
  onFilterChange: (patch: Partial<ArchiveFilters>) => void;
  onToggleTag: (tag: string) => void;
}

interface FilterFieldsProps extends ArchiveToolbarProps {
  idPrefix: string;
}

const seasons: ArchiveSeason[] = ["", "春", "夏", "秋", "冬"];
const ratings = Array.from({ length: 19 }, (_, index) => 10 - index / 2);

function FilterFields({
  filters,
  options,
  queryDraft,
  onQueryChange,
  onFilterChange,
  onToggleTag,
  idPrefix,
}: FilterFieldsProps) {
  const fieldClassName =
    "ui-field h-11 w-full px-3 text-sm";
  const labelClassName =
    "mb-2 block text-[11px] font-bold tracking-[0.08em] text-[var(--ink-muted)]";

  return (
    <>
      <div className="sm:col-span-2">
        <label className={labelClassName} htmlFor={`${idPrefix}-query`}>
          关键词
        </label>
        <input
          className={fieldClassName}
          id={`${idPrefix}-query`}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索标题、标签或感想"
          type="search"
          value={queryDraft}
        />
      </div>

      <div>
        <label className={labelClassName} htmlFor={`${idPrefix}-year`}>
          年份
        </label>
        <select
          className={fieldClassName}
          id={`${idPrefix}-year`}
          onChange={(event) => onFilterChange({ year: event.target.value })}
          value={filters.year}
        >
          <option value="">全部年份</option>
          {options.years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClassName} htmlFor={`${idPrefix}-season`}>
          季度
        </label>
        <select
          className={fieldClassName}
          id={`${idPrefix}-season`}
          onChange={(event) =>
            onFilterChange({
              season: event.target.value as ArchiveSeason,
            })
          }
          value={filters.season}
        >
          {seasons.map((season) => (
            <option key={season || "all"} value={season}>
              {season ? `${season}季` : "全部季度"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClassName} htmlFor={`${idPrefix}-rating`}>
          最低评分
        </label>
        <select
          className={fieldClassName}
          id={`${idPrefix}-rating`}
          onChange={(event) =>
            onFilterChange({
              rating: event.target.value
                ? Number(event.target.value)
                : null,
            })
          }
          value={filters.rating ?? ""}
        >
          <option value="">不限评分</option>
          {ratings.map((rating) => (
            <option key={rating} value={rating}>
              {rating} 分及以上
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClassName} htmlFor={`${idPrefix}-sort`}>
          排序方式
        </label>
        <select
          className={fieldClassName}
          id={`${idPrefix}-sort`}
          onChange={(event) =>
            onFilterChange({ sort: event.target.value as ArchiveSort })
          }
          value={filters.sort}
        >
          <option value="rating">评分优先</option>
          <option value="added">最近添加</option>
          <option value="title">标题顺序</option>
        </select>
      </div>

      {options.tags.length > 0 && (
        <fieldset className="sm:col-span-2 lg:col-span-6">
          <legend className={labelClassName}>标签</legend>
          <div className="flex flex-wrap gap-2">
            {options.tags.map((tag) => {
              const selected = filters.tags.includes(tag);
              return (
                <label
                  className={`ui-chip cursor-pointer px-3 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-pink-300 ${
                    selected ? "ui-chip-active" : ""
                  }`}
                  key={tag}
                >
                  <input
                    checked={selected}
                    className="sr-only"
                    onChange={() => onToggleTag(tag)}
                    type="checkbox"
                  />
                  {tag}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </>
  );
}

export default function ArchiveToolbar(props: ArchiveToolbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) setMobileOpen(false);
  }

  return (
    <form
      aria-label="档案筛选"
      className="ui-panel-strong sticky top-20 z-20 mb-6 p-3 sm:p-5"
      onSubmit={(event) => event.preventDefault()}
      role="search"
    >
      <div className="grid grid-cols-[1fr_auto] gap-2 md:hidden">
        <label className="sr-only" htmlFor="compact-query">
          快速搜索关键词
        </label>
        <input
          className="ui-field h-11 min-w-0 px-3 text-sm"
          id="compact-query"
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="搜索档案"
          type="search"
          value={props.queryDraft}
        />
        <button
          aria-controls="mobile-archive-filters"
          aria-expanded={mobileOpen}
          className="ui-button ui-button-secondary rounded-xl px-4"
          onClick={() => setMobileOpen(true)}
          type="button"
        >
          筛选
        </button>
      </div>

      <div className="hidden grid-cols-2 gap-3 md:grid lg:grid-cols-6">
        <FilterFields {...props} idPrefix="desktop" />
      </div>

      {mobileOpen &&
        createPortal(
          <div
            aria-label="筛选条件"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end bg-[#211d35]/38 backdrop-blur-sm md:hidden"
            id="mobile-archive-filters"
            onClick={closeFromBackdrop}
            role="dialog"
          >
            <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/90 bg-[var(--canvas)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)]">
              <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 flex items-center justify-between border-b border-white/80 bg-[rgba(249,247,251,0.94)] px-5 py-4 backdrop-blur-xl">
                <div>
                  <p className="ui-kicker mb-1">FILTERS</p>
                  <h2 className="text-lg font-bold text-[var(--ink)]">
                  筛选条件
                  </h2>
                </div>
                <button
                  aria-label="关闭筛选条件"
                  className="ui-button ui-button-secondary"
                  onClick={() => setMobileOpen(false)}
                  type="button"
                >
                  完成
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FilterFields {...props} idPrefix="mobile" />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </form>
  );
}
