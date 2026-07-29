"use client";

import type { Anime } from "@/lib/types";
import type {
  ArchiveFilters,
  ArchiveStats,
} from "@/lib/archive/types";

interface ArchiveBrowserProps {
  records: Anime[];
  initialFilters: ArchiveFilters;
  stats: ArchiveStats;
}

export default function ArchiveBrowser({
  records,
  stats,
}: ArchiveBrowserProps) {
  return (
    <div className="mx-auto max-w-7xl px-3 py-8 sm:px-4 sm:py-12">
      <section className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900">我的追番档案</h1>
        <p className="mt-3 text-sm text-gray-600">
          记录每一个季度留下的故事与回忆
        </p>
        <p className="mt-5 inline-flex rounded-full px-4 py-2 text-sm glass">
          共 {stats.total} 部
        </p>
      </section>

      {records.length === 0 && (
        <section className="py-20 text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            还没有建立追番档案
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            添加第一条记录后，它会出现在这里。
          </p>
        </section>
      )}
    </div>
  );
}
