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
    <section className="mb-10 text-center sm:mb-14">
      <p className="mb-3 text-xs font-semibold tracking-[0.24em] text-pink-600">
        ANIME ARCHIVE
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        我的追番档案
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
        记录每一个季度留下的故事与回忆，也让过去喜欢过的作品随时可以被重新找到。
      </p>

      <dl className="mx-auto mt-7 grid max-w-lg grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/70 bg-white/60 px-3 py-3 shadow-sm">
          <dt className="text-xs text-gray-500">收藏</dt>
          <dd className="mt-1 font-semibold text-gray-900">
            共 {stats.total} 部
          </dd>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/60 px-3 py-3 shadow-sm">
          <dt className="text-xs text-gray-500">时间跨度</dt>
          <dd className="mt-1 font-semibold text-gray-900">{yearRange}</dd>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/60 px-3 py-3 shadow-sm">
          <dt className="text-xs text-gray-500">季度</dt>
          <dd className="mt-1 font-semibold text-gray-900">
            {stats.seasonCount} 个
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <Timer />
      </div>
    </section>
  );
}
