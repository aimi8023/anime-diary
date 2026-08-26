"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent, RefObject } from "react";
import { createPortal } from "react-dom";
import type {
  ArchiveFilters,
  ArchiveOptions,
} from "@/lib/archive/types";
import { seasonMonthLabel } from "@/lib/season-label";
import { useArchiveSearch } from "./archive-search-context";
import { useFocusTrap } from "@/components/use-focus-trap";

interface ArchiveToolbarProps {
  filters: ArchiveFilters;
  options: ArchiveOptions;
  queryDraft: string;
  /** 当前条件下的命中数量；提供时在面板头部实时展示。 */
  resultCount?: number;
  onQueryChange: (value: string) => void;
  onFilterChange: (patch: Partial<ArchiveFilters>) => void;
  onToggleTag: (tag: string) => void;
}

interface FilterFieldsProps extends ArchiveToolbarProps {
  idPrefix: string;
  queryInputRef: RefObject<HTMLInputElement | null>;
}

const seasons: Array<ArchiveFilters["season"]> = ["", "春", "夏", "秋", "冬"];
const ratings = Array.from({ length: 19 }, (_, index) => 10 - index / 2);

function FilterFields({
  filters,
  options,
  queryDraft,
  onQueryChange,
  onFilterChange,
  onToggleTag,
  idPrefix,
  queryInputRef,
}: FilterFieldsProps) {
  const fieldClassName =
    "ui-field h-11 w-full px-3 text-sm";
  const labelClassName =
    "mb-2 block text-[11px] font-bold tracking-[0.08em] text-[var(--ink-muted)]";

  return (
    <>
      <div className="col-span-2 md:col-span-4">
        <label className={labelClassName} htmlFor={`${idPrefix}-query`}>
          关键词
        </label>
        <input
          className={fieldClassName}
          id={`${idPrefix}-query`}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索标题、标签或感想"
          ref={queryInputRef}
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
              season: event.target.value as ArchiveFilters["season"],
            })
          }
          value={filters.season}
        >
          {seasons.map((season) => (
            <option key={season || "all"} value={season}>
              {season ? seasonMonthLabel(season) : "全部季度"}
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

      {options.tags.length > 0 && (
        <fieldset className="col-span-2 md:col-span-4">
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

export default function ArchiveSearchPanel(props: ArchiveToolbarProps) {
  const { isSearchOpen, closeSearch } = useArchiveSearch();
  const queryInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLFormElement>(null);
  useFocusTrap(panelRef, isSearchOpen);

  useEffect(() => {
    if (!isSearchOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    queryInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeSearch();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [closeSearch, isSearchOpen]);

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) closeSearch();
  }

  if (!isSearchOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-label="搜索与筛选"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-[#211d35]/28 backdrop-blur-sm md:items-start md:justify-center md:px-6 md:pt-20"
      id="archive-search-panel"
      onClick={closeFromBackdrop}
      role="dialog"
    >
      <form
        aria-label="档案筛选"
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/90 bg-[rgba(249,247,251,0.98)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)] md:max-w-3xl md:rounded-[1.75rem] md:p-6"
        onSubmit={(event) => event.preventDefault()}
        ref={panelRef}
        role="search"
      >
        <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 flex items-center justify-between border-b border-white/80 bg-[rgba(249,247,251,0.94)] px-5 py-4 backdrop-blur-xl md:-mx-6 md:-mt-6 md:px-6">
          <div>
            <p className="ui-kicker mb-1">FIND IN ARCHIVE</p>
            <h2 className="text-lg font-bold text-[var(--ink)]">
              搜索与筛选
            </h2>
            {typeof props.resultCount === "number" && (
              <p
                aria-live="polite"
                className="mt-1 text-xs font-semibold text-[var(--ink-muted)]"
              >
                当前条件：找到 {props.resultCount} 部
              </p>
            )}
          </div>
          <button
            aria-label="关闭搜索与筛选"
            className="ui-button ui-button-secondary"
            onClick={closeSearch}
            type="button"
          >
            完成
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <FilterFields
            {...props}
            idPrefix="archive-search"
            queryInputRef={queryInputRef}
          />
        </div>
      </form>
    </div>,
    document.body,
  );
}
