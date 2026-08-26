import type { ArchiveStats } from "@/lib/archive/types";
import RunningTimer from "@/components/running-timer";

interface ArchiveHeroProps {
  stats: ArchiveStats;
}

/**
 * 首页身份条：一行交代“这是什么、有多少内容、跑了多久”，
 * 把首屏垂直空间留给海报网格。
 */
export default function ArchiveHero({ stats }: ArchiveHeroProps) {
  const yearRange =
    stats.earliestYear && stats.latestYear
      ? stats.earliestYear === stats.latestYear
        ? stats.latestYear
        : `${stats.earliestYear}—${stats.latestYear}`
      : "等待记录";

  return (
    <section className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-lg font-black tracking-tight text-[var(--ink)]">
          追番档案
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">
          {stats.total} 部
          <span aria-hidden="true" className="mx-1.5 text-[var(--ink-subtle)]">
            ·
          </span>
          {yearRange}
          <span aria-hidden="true" className="mx-1.5 text-[var(--ink-subtle)]">
            ·
          </span>
          {stats.seasonCount} 个季度
        </p>
      </div>
      <RunningTimer />
    </section>
  );
}
