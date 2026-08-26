"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Anime } from "@/lib/types";
import CoverImage from "@/components/cover-image";

interface ArchiveAnimeCardProps {
  anime: Anime;
  index: number;
  onSelect: (anime: Anime) => void;
}

export default function ArchiveAnimeCard({
  anime,
  index,
  onSelect,
}: ArchiveAnimeCardProps) {
  const reduceMotion = useReducedMotion();

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
        aria-label={`查看《${anime.title}》详情`}
        className="ui-focus archive-poster-card block h-full w-full rounded-[0.9rem] text-left"
        onClick={() => onSelect(anime)}
        type="button"
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-pink-50 to-blue-50">
          {anime.cover ? (
            <CoverImage
              alt=""
              className="object-cover transition duration-500 group-hover:scale-105"
              fallbackLabel={anime.title}
              loading={index === 0 ? "eager" : undefined}
              sizes="(max-width: 419px) 50vw, (max-width: 639px) 33vw, (max-width: 1023px) 25vw, (max-width: 1279px) 16.67vw, 14.3vw"
              src={anime.cover}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#fdeef5] to-[#e8f2fc]">
              <span
                aria-hidden="true"
                className="text-3xl font-black tracking-tight text-[var(--ink-subtle)]"
              >
                {anime.title.charAt(0) || "◌"}
              </span>
              <span className="px-2 text-center text-[10px] font-semibold text-[var(--ink-subtle)]">
                封面暂缺
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#211d35]/30 to-transparent" />
          <span className="absolute right-2 top-2 rounded-full border border-white/80 bg-[rgba(255,248,228,0.92)] px-2 py-0.5 text-[11px] font-black text-[var(--warning)] shadow-sm backdrop-blur">
            ★ {anime.rating}
          </span>
        </div>
        <div className="p-2.5 sm:p-3">
          <h4
            className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[var(--ink)]"
            title={anime.title}
          >
            {anime.title}
          </h4>
        </div>
      </button>
    </motion.article>
  );
}
