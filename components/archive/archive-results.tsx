"use client";

import type { Anime } from "@/lib/types";
import { groupAnimeByYear } from "@/lib/archive/filter";
import type { ArchiveSort } from "@/lib/archive/types";
import YearSection from "./year-section";

interface ArchiveResultsProps {
  records: Anime[];
  sort: ArchiveSort;
  onSelect: (anime: Anime) => void;
  onClearFilters: () => void;
}

export default function ArchiveResults({
  records,
  sort,
  onSelect,
  onClearFilters,
}: ArchiveResultsProps) {
  if (records.length === 0) {
    return (
      <div className="ui-panel-strong border-dashed px-6 py-16 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--info-soft)] text-xl text-[var(--info)]"
        >
          ⌕
        </span>
        <h2 className="mt-4 font-bold text-[var(--ink)]">
          没有匹配的记录
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          可以减少筛选条件，或者换一个关键词。
        </p>
        <button
          className="ui-button ui-button-primary mt-5"
          onClick={onClearFilters}
          type="button"
        >
          清除筛选
        </button>
      </div>
    );
  }

  const groups = groupAnimeByYear(records, sort);

  return (
    <div className="space-y-6">
      {groups.map((group, index) => (
        <YearSection
          group={group}
          initiallyOpen={index === 0}
          key={`${group.year}-${index}`}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
