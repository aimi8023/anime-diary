"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { Anime } from "@/lib/types";

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
      className="group relative overflow-hidden rounded-[1.15rem] border border-white/85 bg-[rgba(255,255,255,0.72)] shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
      transition={{
        delay: reduceMotion ? 0 : Math.min(index, 8) * 0.035,
        duration: reduceMotion ? 0 : 0.3,
      }}
    >
      <button
        aria-label={`查看《${anime.title}》详情`}
        className="ui-focus archive-poster-card block h-full w-full rounded-[1.15rem] text-left"
        onClick={() => onSelect(anime)}
        type="button"
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-pink-50 to-blue-50">
          {anime.cover ? (
            <Image
              alt=""
              className="object-cover transition duration-500 group-hover:scale-105"
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              src={anime.cover}
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-gray-300">
              ◌
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#211d35]/38 to-transparent" />
          <span className="absolute right-2.5 top-2.5 rounded-full border border-white/80 bg-[rgba(255,248,228,0.9)] px-2.5 py-1 text-xs font-black text-[var(--warning)] shadow-sm backdrop-blur">
            ★ {anime.rating}
          </span>
        </div>
        <div className="p-3.5 sm:p-4">
          <p className="text-[10px] font-bold tracking-[0.12em] text-[var(--accent-strong)]">
            {anime.season}
          </p>
          <h4
            className="mt-1.5 line-clamp-2 min-h-11 font-bold leading-[1.4] text-[var(--ink)]"
            title={anime.title}
          >
            {anime.title}
          </h4>
          {anime.tags.length > 0 && (
            <div className="mt-3 flex min-h-6 flex-wrap gap-1.5">
              {anime.tags.slice(0, 3).map((tag) => (
                <span
                  className="rounded-full bg-white/72 px-2 py-1 text-[10px] font-medium text-[var(--ink-muted)]"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[var(--ink-muted)]">
            {anime.comment || "还没有写下感想"}
          </p>
        </div>
      </button>
    </motion.article>
  );
}
