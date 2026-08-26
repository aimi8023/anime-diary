import type { ArchiveFilters, ArchiveSort } from "@/lib/archive/types";

interface ActiveFiltersProps {
  filters: ArchiveFilters;
  resultCount: number;
  onClear: () => void;
  onRemove: (key: keyof ArchiveFilters, value?: string) => void;
  onSortChange: (sort: ArchiveSort) => void;
}

const sortOptions: Array<{ value: ArchiveSort; label: string }> = [
  { value: "rating", label: "评分" },
  { value: "added", label: "最新" },
  { value: "title", label: "标题" },
];

function hasActiveFilters(filters: ArchiveFilters) {
  return (
    filters.q !== "" ||
    filters.year !== "" ||
    filters.season !== "" ||
    filters.tags.length > 0 ||
    filters.rating !== null
  );
}

export default function ActiveFilters({
  filters,
  resultCount,
  onClear,
  onRemove,
  onSortChange,
}: ActiveFiltersProps) {
  const chips: Array<{
    key: keyof ArchiveFilters;
    label: string;
    value?: string;
  }> = [];
  if (filters.q) chips.push({ key: "q", label: `关键词 ${filters.q}` });
  if (filters.year) {
    chips.push({ key: "year", label: `年份 ${filters.year}` });
  }
  if (filters.season) {
    chips.push({ key: "season", label: `季度 ${filters.season}` });
  }
  for (const tag of filters.tags) {
    chips.push({ key: "tags", label: `标签 ${tag}`, value: tag });
  }
  if (filters.rating !== null) {
    chips.push({
      key: "rating",
      label: `评分 ${filters.rating} 分以上`,
    });
  }

  return (
    <div className="mb-8 flex min-h-11 flex-wrap items-center gap-2 rounded-2xl px-1">
      <p
        aria-live="polite"
        className="mr-2 text-sm font-bold text-[var(--ink)]"
      >
        找到 {resultCount} 部
      </p>
      {chips.map((chip) => (
        <button
          aria-label={`移除${chip.label}`}
          className="ui-chip ui-chip-active min-h-9 px-3 text-xs"
          key={`${chip.key}-${chip.value ?? chip.label}`}
          onClick={() => onRemove(chip.key, chip.value)}
          type="button"
        >
          {chip.label}
          <span aria-hidden="true" className="ml-1">
            ×
          </span>
        </button>
      ))}
      <div
        aria-label="排序方式"
        className="ml-auto flex items-center gap-1.5"
        role="group"
      >
        <span className="text-xs font-semibold text-[var(--ink-subtle)]">
          排序
        </span>
        <div className="flex gap-1 rounded-full border border-white/80 bg-white/55 p-1">
          {sortOptions.map((option) => {
            const active = filters.sort === option.value;
            return (
              <button
                aria-pressed={active}
                className={`min-h-8 rounded-full px-3 text-xs font-bold transition-colors ${
                  active
                    ? "bg-white text-[var(--accent-strong)] shadow-sm"
                    : "text-[var(--ink-muted)] hover:bg-white/70"
                }`}
                key={option.value}
                onClick={() => onSortChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      {hasActiveFilters(filters) && (
        <button
          className="ui-button ui-button-secondary min-h-9 px-3 py-2 text-xs"
          onClick={onClear}
          type="button"
        >
          清除全部筛选
        </button>
      )}
    </div>
  );
}
