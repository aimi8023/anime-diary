"use client";

import { motion } from "framer-motion";
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
  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/65 shadow-sm transition-shadow hover:shadow-xl hover:shadow-pink-100/60"
      initial={{ opacity: 0, y: 18 }}
      transition={{
        delay: Math.min(index, 8) * 0.04,
        duration: 0.35,
      }}
    >
      <button
        aria-label={`查看《${anime.title}》详情`}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-500"
        onClick={() => onSelect(anime)}
        type="button"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-pink-50 to-blue-50">
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
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h4
              className="min-w-0 truncate font-semibold text-gray-900"
              title={anime.title}
            >
              {anime.title}
            </h4>
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
              ★ {anime.rating}
            </span>
          </div>
          {anime.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {anime.tags.slice(0, 3).map((tag) => (
                <span
                  className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-600"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 truncate text-xs leading-5 text-gray-600">
            {anime.comment || "还没有写下感想"}
          </p>
        </div>
      </button>
    </motion.article>
  );
}
