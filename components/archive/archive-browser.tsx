"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Anime } from "@/lib/types";
import {
  DEFAULT_ARCHIVE_FILTERS,
  filterAnime,
  getArchiveOptions,
  parseArchiveFilters,
  serializeArchiveFilters,
} from "@/lib/archive/filter";
import type {
  ArchiveFilters,
  ArchiveStats,
} from "@/lib/archive/types";
import ActiveFilters from "./active-filters";
import ArchiveHero from "./archive-hero";
import AnimeDetailDialog from "./anime-detail-dialog";
import ArchiveResults from "./archive-results";
import ArchiveSearchPanel from "./archive-search-panel";

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
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
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
    function restoreFromHistory() {
      const restored = parseArchiveFilters(
        new URLSearchParams(window.location.search),
      );
      setFilters(restored);
      setQueryDraft(restored.q);
    }

    window.addEventListener("popstate", restoreFromHistory);
    return () => window.removeEventListener("popstate", restoreFromHistory);
  }, []);

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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
      <ArchiveHero stats={stats} />
      <ArchiveSearchPanel
        filters={filters}
        onFilterChange={updateFilters}
        onQueryChange={setQueryDraft}
        onToggleTag={toggleTag}
        options={options}
        queryDraft={queryDraft}
      />

      {records.length === 0 ? (
        <section className="ui-panel-strong mx-auto max-w-2xl px-6 py-16 text-center">
          <span
            aria-hidden="true"
            className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)] text-2xl text-[var(--accent-strong)]"
          >
            ◌
          </span>
          <h2 className="mt-5 text-xl font-bold text-[var(--ink)]">
            还没有建立追番档案
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            添加第一条记录后，属于你的季度回忆会从这里开始。
          </p>
        </section>
      ) : (
        <section id="archive">
          <ActiveFilters
            filters={filters}
            onClear={clearFilters}
            onRemove={removeFilter}
            resultCount={filteredRecords.length}
          />
          <ArchiveResults
            onClearFilters={clearFilters}
            onSelect={setSelectedAnime}
            records={filteredRecords}
            sort={filters.sort}
          />
        </section>
      )}
      <AnimeDetailDialog
        anime={selectedAnime}
        onClose={() => setSelectedAnime(null)}
      />
    </div>
  );
}
