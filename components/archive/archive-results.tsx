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
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white/40 px-6 py-16 text-center">
        <h2 className="font-semibold text-gray-800">没有匹配的记录</h2>
        <p className="mt-2 text-sm text-gray-600">
          可以减少筛选条件，或者换一个关键词。
        </p>
        <button
          className="mt-5 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white"
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
    <div className="space-y-5">
      {groups.map((group, index) => (
        <YearSection
          group={group}
          initiallyOpen={index === 0}
          key={group.year}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
