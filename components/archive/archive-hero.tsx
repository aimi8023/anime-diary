import Timer from "@/components/timer";
import type { ArchiveStats } from "@/lib/archive/types";

interface ArchiveHeroProps {
  stats: ArchiveStats;
}

export default function ArchiveHero({ stats }: ArchiveHeroProps) {
  const yearRange =
    stats.earliestYear && stats.latestYear
      ? stats.earliestYear === stats.latestYear
        ? stats.latestYear
        : `${stats.earliestYear}—${stats.latestYear}`
      : "等待记录";

  return (
    <section className="mb-12 grid items-end gap-8 lg:mb-16 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:gap-12">
      <div>
        <p className="ui-kicker mb-4">ANIME ARCHIVE</p>
        <h1 className="max-w-3xl text-4xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-6xl lg:text-7xl">
          我的追番档案
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--ink-muted)] sm:text-base sm:leading-8">
          记录每一个季度留下的故事与回忆，也让过去喜欢过的作品随时可以被重新找到。
        </p>
        <div className="mt-6">
          <Timer />
        </div>
      </div>

      <div className="ui-panel p-3 sm:p-4">
        <p className="px-2 pb-3 text-xs font-semibold tracking-[0.16em] text-[var(--ink-subtle)]">
          ARCHIVE SNAPSHOT
        </p>
        <dl className="grid divide-x divide-[rgba(91,83,112,0.12)] overflow-hidden rounded-2xl bg-white/58" style={{ gridTemplateColumns: '1fr 1.2fr 1fr' }} >
          <div className="px-3 py-4 sm:px-4">
            <dd className="text-xl font-black tabular-nums text-[var(--ink)] sm:text-2xl">
              <span aria-hidden="true">{stats.total}</span>
              <span className="sr-only">共 {stats.total} 部</span>
            </dd>
            <dt className="mt-1 text-[11px] text-[var(--ink-subtle)] sm:text-xs">
              收藏作品
            </dt>
          </div>
          <div className="px-3 py-4 sm:px-4">
            <dd className="truncate text-base font-black tabular-nums text-[var(--ink)] sm:text-2xl">
              {yearRange}
            </dd>
            <dt className="mt-1 text-[11px] text-[var(--ink-subtle)] sm:text-xs">
              时间跨度
            </dt>
          </div>
          <div className="px-3 py-4 sm:px-4">
            <dd className="text-xl font-black tabular-nums text-[var(--ink)] sm:text-2xl">
              {stats.seasonCount}
            </dd>
            <dt className="mt-1 text-[11px] text-[var(--ink-subtle)] sm:text-xs">
              收录季度
            </dt>
          </div>
        </dl>
      </div>
    </section>
  );
}
