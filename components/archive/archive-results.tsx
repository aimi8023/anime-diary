"use client";

import type { Anime } from "@/lib/types";
import type { ArchiveCardGroup, ArchiveFilters } from "@/lib/archive/types";
import { groupArchive, groupWorksByOrder } from "@/lib/archive/filter";
import type { ArchiveWork } from "@/lib/archive/works";
import { formatSeasonLabel } from "@/lib/season-label";
import ArchiveAnimeCard from "./archive-anime-card";
import ArchiveWorkCard from "./archive-work-card";

interface ArchiveResultsProps {
  records: Anime[];
  /** 「作品」分类下已聚合好的作品；单作分类传空数组。 */
  works: ArchiveWork[];
  filters: ArchiveFilters;
  onSelect: (anime: Anime) => void;
  onClearFilters: () => void;
}

// 列数与 ArchiveAnimeCard 中 CoverImage 的 sizes 档位保持一致：2/3/4/6/7。
const GRID_CLASS =
  "grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6 xl:grid-cols-7";

export default function ArchiveResults({
  records,
  works,
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

  // 「作品」分类：一部作品一张卡，排列仍可用季度或评分。
  if (filters.scope === "work") {
    const workGroups = groupWorksByOrder(works, filters);
    return (
      <div className="space-y-10">
        {workGroups.map((group) => (
          <section aria-label={group.label} key={group.key}>
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="text-base font-black tracking-tight text-[var(--ink)]">
                {group.label}
              </h3>
              <span className="text-xs text-[var(--ink-subtle)]">
                {group.works.length} 部作品
              </span>
            </div>
            <div className={GRID_CLASS}>
              {group.works.map((work, index) => (
                <ArchiveWorkCard
                  index={index}
                  key={work.key}
                  onSelect={onSelect}
                  work={work}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const groups: ArchiveCardGroup[] = groupArchive(records, filters);
  const showSeasonLabel = filters.group === "rating";

  return (
    <div className="space-y-10">
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
          <div className={GRID_CLASS}>
            {group.records.map((anime, index) => (
              <ArchiveAnimeCard
                anime={anime}
                index={index}
                key={anime.id}
                onSelect={onSelect}
                seasonLabel={
                  showSeasonLabel ? formatSeasonLabel(anime.season) : undefined
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
