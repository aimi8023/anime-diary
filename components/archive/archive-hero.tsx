import type { ArchiveStats } from "@/lib/archive/types";
import SiteRunningDays from "@/components/site-running-days";

// 站点启用时间，用于计算运行天数。
const SITE_LAUNCHED_AT = "2026-06-08T21:45:00";

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
    <section className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
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
      <SiteRunningDays launchedAt={SITE_LAUNCHED_AT} />
    </section>
  );
}
