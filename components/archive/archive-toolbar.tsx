"use client";

import { useState } from "react";
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
    "h-11 w-full rounded-xl border border-gray-200 bg-white/80 px-3 text-sm text-gray-800 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100";
  const labelClassName = "mb-1.5 block text-xs font-medium text-gray-600";

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
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition ${
                    selected
                      ? "border-pink-300 bg-pink-50 text-pink-700"
                      : "border-gray-200 bg-white/70 text-gray-600 hover:border-gray-300"
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

  return (
    <section
      aria-label="档案筛选"
      className="sticky top-3 z-20 mb-6 rounded-3xl border border-white/80 bg-white/75 p-3 shadow-lg shadow-gray-200/40 backdrop-blur-xl sm:p-5"
    >
      <div className="grid grid-cols-[1fr_auto] gap-2 md:hidden">
        <label className="sr-only" htmlFor="compact-query">
          快速搜索关键词
        </label>
        <input
          className="h-11 min-w-0 rounded-xl border border-gray-200 bg-white/80 px-3 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
          id="compact-query"
          onChange={(event) => props.onQueryChange(event.target.value)}
          placeholder="搜索档案"
          type="search"
          value={props.queryDraft}
        />
        <button
          aria-controls="mobile-archive-filters"
          aria-expanded={mobileOpen}
          className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700"
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
            className="fixed inset-0 z-50 flex items-end bg-gray-950/30 md:hidden"
            id="mobile-archive-filters"
            role="dialog"
          >
            <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
              <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
                <h2 className="text-lg font-semibold text-gray-900">
                  筛选条件
                </h2>
                <button
                  aria-label="关闭筛选条件"
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600"
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
    </section>
  );
}
