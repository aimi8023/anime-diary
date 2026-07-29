"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Anime } from "@/lib/types";
import {
  DEFAULT_ARCHIVE_FILTERS,
  filterAnime,
  getArchiveOptions,
  serializeArchiveFilters,
} from "@/lib/archive/filter";
import type {
  ArchiveFilters,
  ArchiveStats,
} from "@/lib/archive/types";
import ActiveFilters from "./active-filters";
import ArchiveHero from "./archive-hero";
import ArchiveToolbar from "./archive-toolbar";

interface ArchiveBrowserProps {
  records: Anime[];
  initialFilters: ArchiveFilters;
  stats: ArchiveStats;
}

export default function ArchiveBrowser({
  records,
  initialFilters,
  stats,
}: ArchiveBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const [filters, setFilters] = useState(initialFilters);
  const [queryDraft, setQueryDraft] = useState(initialFilters.q);
  const options = useMemo(() => getArchiveOptions(records), [records]);
  const filteredRecords = useMemo(
    () => filterAnime(records, filters),
    [filters, records],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextQuery = queryDraft.trim();
      setFilters((current) =>
        current.q === nextQuery ? current : { ...current, q: nextQuery },
      );
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [queryDraft]);

  useEffect(() => {
    const nextSearch = serializeArchiveFilters(filters).toString();
    if (nextSearch === currentSearch) return;
    router.replace(nextSearch ? `/?${nextSearch}` : "/", {
      scroll: false,
    });
  }, [currentSearch, filters, router]);

  function updateFilters(patch: Partial<ArchiveFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function toggleTag(tag: string) {
    setFilters((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  }

  function clearFilters() {
    setQueryDraft("");
    setFilters(DEFAULT_ARCHIVE_FILTERS);
  }

  function removeFilter(key: keyof ArchiveFilters, value?: string) {
    if (key === "q") setQueryDraft("");
    setFilters((current) => {
      if (key === "tags") {
        return {
          ...current,
          tags: current.tags.filter((tag) => tag !== value),
        };
      }
      const defaults = DEFAULT_ARCHIVE_FILTERS;
      return { ...current, [key]: defaults[key] };
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-8 sm:px-4 sm:py-12">
      <ArchiveHero stats={stats} />

      {records.length === 0 ? (
        <section className="py-20 text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            还没有建立追番档案
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            添加第一条记录后，它会出现在这里。
          </p>
        </section>
      ) : (
        <section id="archive">
          <ArchiveToolbar
            filters={filters}
            onFilterChange={updateFilters}
            onQueryChange={setQueryDraft}
            onToggleTag={toggleTag}
            options={options}
            queryDraft={queryDraft}
          />
          <ActiveFilters
            filters={filters}
            onClear={clearFilters}
            onRemove={removeFilter}
            resultCount={filteredRecords.length}
          />
          {filteredRecords.length === 0 && (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white/40 px-6 py-16 text-center">
              <h2 className="font-semibold text-gray-800">没有匹配的记录</h2>
              <p className="mt-2 text-sm text-gray-600">
                可以减少筛选条件，或者换一个关键词。
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
