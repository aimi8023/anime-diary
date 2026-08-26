"use client";

import type { Anime } from "@/lib/types";
import type { ArchiveCardGroup, ArchiveFilters } from "@/lib/archive/types";
import { groupArchive } from "@/lib/archive/filter";
import ArchiveAnimeCard from "./archive-anime-card";
import ScrollRow from "./scroll-row";

interface ArchiveResultsProps {
  records: Anime[];
  filters: ArchiveFilters;
  onSelect: (anime: Anime) => void;
  onClearFilters: () => void;
}

const ROW_CARD_CLASS =
  "w-[122px] shrink-0 snap-start sm:w-[140px]";

function PosterRow({
  cards,
  onSelect,
}: {
  cards: Anime[];
  onSelect: (anime: Anime) => void;
}) {
  return (
    <ScrollRow>
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
    </ScrollRow>
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
