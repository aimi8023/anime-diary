"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Anime } from "@/lib/types";
import {
  countArchiveScopes,
  DEFAULT_ARCHIVE_FILTERS,
  filterAnimeByWorks,
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
import ArchiveSearchBar from "./archive-search-bar";
import { onlyGroupedWorks } from "@/lib/archive/works";

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
  const [filters, setFilters] = useState(initialFilters);
  const [queryDraft, setQueryDraft] = useState(initialFilters.q);
  // 只记住选中 id：筛选结果变化时自动派生记录与相邻关系。
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const options = useMemo(() => getArchiveOptions(records), [records]);
  // 作品层筛选：条件与标记都作用在作品上，所以要拿全量 records。
  const filteredRecords = useMemo(
    () => filterAnimeByWorks(records, filters),
    [filters, records],
  );
  // 「作品」分类下一部作品一张卡。
  const works = useMemo(
    () => (filters.scope === "work" ? onlyGroupedWorks(filteredRecords) : []),
    [filteredRecords, filters.scope],
  );
  // 两个分类的命中数：必须在分类收敛之前统计。
  const scopeCounts = useMemo(
    () => countArchiveScopes(records, filters),
    [filters, records],
  );
  const selectedIndex = filteredRecords.findIndex(
    (anime) => anime.id === selectedId,
  );
  const selectedAnime =
    selectedIndex >= 0 ? filteredRecords[selectedIndex] : null;

  const navigateSelection = useCallback(
    (delta: 1 | -1) => {
      setSelectedId((current) => {
        const index = filteredRecords.findIndex(
          (anime) => anime.id === current,
        );
        if (index === -1) return current;
        const next = index + delta;
        if (next < 0 || next >= filteredRecords.length) return current;
        return filteredRecords[next].id;
      });
    },
    [filteredRecords],
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
      const params = new URLSearchParams(window.location.search);
      const restored = parseArchiveFilters(params);
      setFilters(restored);
      setQueryDraft(restored.q);
      const deepLinkId = params.get("anime");
      setSelectedId(
        deepLinkId && records.some((anime) => anime.id === deepLinkId)
          ? deepLinkId
          : null,
      );
    }

    window.addEventListener("popstate", restoreFromHistory);
    return () => window.removeEventListener("popstate", restoreFromHistory);
  }, [records]);

  // 筛选条件与选中记录只写入浏览器历史，不触发服务端重新渲染：
  // 全部记录已随首屏下发，Next.js 会同步 useSearchParams 消费方（导航徽标）。
  useEffect(() => {
    const params = serializeArchiveFilters(filters);
    if (selectedId) params.set("anime", selectedId);
    const search = params.toString();
    const target = search ? `/?${search}` : "/";
    if (
      `${window.location.pathname}${window.location.search}` === target
    ) {
      return;
    }
    window.history.replaceState(null, "", target);
  }, [filters, selectedId]);

  // 支持 /?anime=id 深链：参数在首次渲染时捕获，避免与 URL 同步竞争，
  // 放进宏任务应用以满足“不在 effect 体内同步 setState”的约束。
  const [initialDeepLinkId] = useState(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("anime"),
  );

  useEffect(() => {
    if (!initialDeepLinkId) return;
    const timer = window.setTimeout(() => {
      setSelectedId(
        (current) =>
          current ??
          (records.some((anime) => anime.id === initialDeepLinkId)
            ? initialDeepLinkId
            : null),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialDeepLinkId, records]);

  function updateFilters(patch: Partial<ArchiveFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function toggleMark(mark: string) {
    setFilters((current) => ({
      ...current,
      marks: current.marks.includes(mark)
        ? current.marks.filter((item) => item !== mark)
        : [...current.marks, mark],
    }));
  }

  function clearFilters() {
    setQueryDraft("");
    // 排列维度与方向是浏览偏好，清除筛选时保持不变。
    setFilters((current) => ({
      ...DEFAULT_ARCHIVE_FILTERS,
      direction: current.direction,
      group: current.group,
    }));
  }

  function removeFilter(key: keyof ArchiveFilters, value?: string) {
    if (key === "q") setQueryDraft("");
    setFilters((current) => {
      if (key === "marks") {
        return {
          ...current,
          marks: current.marks.filter((mark) => mark !== value),
        };
      }
      const defaults = DEFAULT_ARCHIVE_FILTERS;
      return { ...current, [key]: defaults[key] };
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
      <ArchiveHero stats={stats} />
      <ArchiveSearchBar
        filters={filters}
        onFilterChange={updateFilters}
        onQueryChange={setQueryDraft}
        onToggleMark={toggleMark}
        options={options}
        queryDraft={queryDraft}
      />
      <ActiveFilters
        filters={filters}
        onClear={clearFilters}
        onDirectionChange={(direction) => updateFilters({ direction })}
        onGroupChange={(group) => updateFilters({ group })}
        onRemove={removeFilter}
        onScopeChange={(scope) => updateFilters({ scope })}
        resultCount={
          filters.scope === "work" ? works.length : filteredRecords.length
        }
        soloCount={scopeCounts.solo}
        workCount={scopeCounts.work}
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
          <ArchiveResults
            filters={filters}
            onClearFilters={clearFilters}
            onSelect={(anime) => setSelectedId(anime.id)}
            records={filteredRecords}
            works={works}
          />
        </section>
      )}
      <AnimeDetailDialog
        anime={selectedAnime}
        onClose={() => setSelectedId(null)}
        onNavigate={
          filteredRecords.length > 1 ? navigateSelection : undefined
        }
        position={
          selectedAnime
            ? { index: selectedIndex, total: filteredRecords.length }
            : null
        }
        sharePath={selectedAnime ? `/?anime=${selectedAnime.id}` : null}
      />
  </div>
);
}
