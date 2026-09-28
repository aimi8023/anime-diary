"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Anime } from "@/lib/types";
import { archiveMarkLabel, toDisplayMarks } from "@/lib/anime/marks";
import type { ArchiveWork } from "@/lib/archive/works";
import CoverImage from "@/components/cover-image";

/** 卡片角落最多显示的标记数，其余折叠成 +N。 */
const MAX_VISIBLE_MARKS = 2;

interface ArchiveWorkCardProps {
  work: ArchiveWork;
  index: number;
  onSelect: (anime: Anime) => void;
}

/**
 * 「按作品」视图的卡片：同一部作品的多季、上下半与剧场版合并为一张。
 * 海报取最早那条，评分取已评分条目的均分，标记取并集。
 */
export default function ArchiveWorkCard({
  work,
  index,
  onSelect,
}: ArchiveWorkCardProps) {
  const reduceMotion = useReducedMotion();
  // 以最早一条为代表：封面和标题都来自它。
  const primary = work.records[0];
  const marks = toDisplayMarks(
    work.records.flatMap((anime) => anime.marks ?? []),
  );
  const visibleMarks = marks.slice(0, MAX_VISIBLE_MARKS);
  const hiddenMarkCount = marks.length - visibleMarks.length;

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-[0.9rem] border border-white/85 bg-[rgba(255,255,255,0.76)] shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
      transition={{
        delay: reduceMotion ? 0 : Math.min(index, 8) * 0.035,
        duration: reduceMotion ? 0 : 0.3,
      }}
    >
      <button
        aria-label={`查看《${work.name}》详情`}
        className="ui-focus block h-full w-full rounded-[0.9rem] text-left"
        onClick={() => onSelect(primary)}
        type="button"
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-pink-50 to-blue-50">
          {primary.cover ? (
            <CoverImage
              alt=""
              className="object-cover transition duration-500 group-hover:scale-105"
              fallbackLabel={work.name}
              loading={index === 0 ? "eager" : undefined}
              sizes="(max-width: 419px) 50vw, (max-width: 639px) 33vw, (max-width: 1023px) 25vw, (max-width: 1279px) 16.67vw, 14.3vw"
              src={primary.cover}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#fdeef5] to-[#e8f2fc]">
              <span
                aria-hidden="true"
                className="text-3xl font-black tracking-tight text-[var(--ink-subtle)]"
              >
                {work.name.charAt(0) || "◌"}
              </span>
              <span className="px-2 text-center text-[10px] font-semibold text-[var(--ink-subtle)]">
                封面暂缺
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#211d35]/30 to-transparent" />

          {marks.length > 0 && (
            <span className="absolute left-2 top-2 flex max-w-[70%] flex-wrap gap-1">
              {visibleMarks.map((mark) => (
                <span
                  className="rounded-full border border-white/80 bg-[rgba(255,255,255,0.9)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-strong)] shadow-sm"
                  key={mark}
                >
                  {archiveMarkLabel(mark)}
                </span>
              ))}
              {hiddenMarkCount > 0 && (
                <span
                  aria-label={`另有 ${hiddenMarkCount} 个标记`}
                  className="rounded-full border border-white/80 bg-[rgba(255,255,255,0.9)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-muted)] shadow-sm"
                >
                  +{hiddenMarkCount}
                </span>
              )}
            </span>
          )}

          <span
            className={`absolute right-2 top-2 rounded-full border border-white/80 px-2 py-0.5 text-[11px] font-black shadow-sm ${
              work.averageRating !== null
                ? "bg-[rgba(255,248,228,0.92)] text-[var(--warning)]"
                : "bg-[rgba(255,255,255,0.85)] text-[var(--ink-subtle)]"
            }`}
          >
            {work.averageRating !== null ? `★ ${work.averageRating}` : "未评分"}
          </span>

          {work.isGrouped && (
            <span className="absolute bottom-2 left-2 rounded-full bg-[#211d35]/72 px-2 py-0.5 text-[10px] font-bold text-white">
              {work.records.length} 条目
            </span>
          )}
        </div>
        <div className="p-2.5 sm:p-3">
          <h4
            className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[var(--ink)]"
            title={work.name}
          >
            {work.name}
          </h4>
          {work.isGrouped && (
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--ink-subtle)]">
              {work.seasonLabels.join(" · ")}
            </p>
          )}
        </div>
      </button>
    </motion.article>
  );
}
