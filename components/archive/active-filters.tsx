import type {
  ArchiveDirection,
  ArchiveFilters,
  ArchiveGroup,
} from "@/lib/archive/types";

interface ActiveFiltersProps {
  filters: ArchiveFilters;
  resultCount: number;
  onClear: () => void;
  onRemove: (key: keyof ArchiveFilters, value?: string) => void;
  onGroupChange: (group: ArchiveGroup) => void;
  onDirectionChange: (direction: ArchiveDirection) => void;
  onOpenYearArchive: () => void;
}

const groupOptions: Array<{ value: ArchiveGroup; label: string }> = [
  { value: "season", label: "季度" },
  { value: "rating", label: "评分" },
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
  onGroupChange,
  onDirectionChange,
  onOpenYearArchive,
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
      <button
        className="ui-button ui-button-secondary min-h-9 px-3 py-2 text-xs"
        onClick={onOpenYearArchive}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M4 19V9m5 10V5m5 14v-7m5 7V8"
            strokeLinecap="round"
          />
        </svg>
        年度档案
      </button>
      <p
        aria-live="polite"
        className="text-sm font-bold text-[var(--ink)]"
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
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <div
          aria-label="排列维度"
          className="flex items-center gap-1.5"
          role="group"
        >
          <span className="text-xs font-semibold text-[var(--ink-subtle)]">
            排列
          </span>
          <div className="flex gap-1 rounded-full border border-white/80 bg-white/55 p-1">
            {groupOptions.map((option) => {
              const active = filters.group === option.value;
              return (
                <button
                  aria-pressed={active}
                  className={`min-h-8 rounded-full px-3 text-xs font-bold transition-colors ${
                    active
                      ? "bg-white text-[var(--accent-strong)] shadow-sm"
                      : "text-[var(--ink-muted)] hover:bg-white/70"
                  }`}
                  key={option.value}
                  onClick={() => onGroupChange(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <button
          aria-label={
            filters.direction === "desc" ? "改为升序排列" : "改为降序排列"
          }
          className="ui-button ui-button-secondary min-h-9 gap-1 px-3 py-2 text-xs"
          onClick={() =>
            onDirectionChange(
              filters.direction === "desc" ? "asc" : "desc",
            )
          }
          title={filters.direction === "desc" ? "当前降序（高→低 / 新→旧）" : "当前升序（低→高 / 旧→新）"}
          type="button"
        >
          {filters.direction === "desc" ? "降序 ↓" : "升序 ↑"}
        </button>
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
    </div>
  );
}
