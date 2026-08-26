"use client";

import type { Anime } from "@/lib/types";
import type { ArchiveCardGroup, ArchiveFilters } from "@/lib/archive/types";
import { groupArchive } from "@/lib/archive/filter";
import ArchiveAnimeCard from "./archive-anime-card";

interface ArchiveResultsProps {
  records: Anime[];
  filters: ArchiveFilters;
  onSelect: (anime: Anime) => void;
  onClearFilters: () => void;
}

const ROW_CARD_CLASS =
  "w-[104px] shrink-0 snap-start sm:w-[118px]";

function PosterRow({
  cards,
  onSelect,
}: {
  cards: Anime[];
  onSelect: (anime: Anime) => void;
}) {
  return (
    <div className="flex snap-x gap-2.5 overflow-x-auto pb-2 sm:gap-3">
      {cards.map((anime, index) => (
        <ArchiveAnimeCard
          anime={anime}
          compact
          index={index}
          key={anime.id}
          onSelect={onSelect}
          className={ROW_CARD_CLASS}
        />
      ))}
    </div>
  );
}

export default function ArchiveResults({
  records,
  filters,
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

  // 时间维度：不分组，渲染为连续网格，按收录时间排开。
  if (filters.group === "time") {
    return (
      <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6 xl:grid-cols-7">
        {records.map((anime, index) => (
          <ArchiveAnimeCard
            anime={anime}
            index={index}
            key={anime.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  const groups: ArchiveCardGroup[] = groupArchive(records, filters);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section aria-label={group.label} key={group.key}>
          <div className="mb-3 flex items-baseline gap-2">
            <h3 className="text-base font-black tracking-tight text-[var(--ink)]">
              {group.label}
            </h3>
            <span className="text-xs text-[var(--ink-subtle)]">
              {group.records.length} 部
            </span>
          </div>
          <PosterRow cards={group.records} onSelect={onSelect} />
        </section>
      ))}
    </div>
  );
}
