"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Anime } from "@/lib/types";
import AnimeCard from "./anime-card";

interface SeasonSectionProps {
  season: string;
  animeList: Anime[];
}

function formatSeason(season: string): string {
  const match = season.match(/^(\d{4})(春|夏|秋|冬)$/);
  if (!match) return season;
  const seasonName: Record<string, string> = {
    春: "春",
    夏: "夏",
    秋: "秋",
    冬: "冬",
  };
  return `${match[1]}年${seasonName[match[2]]}季`;
}

export default function SeasonSection({ season, animeList }: SeasonSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Sort by rating descending
  const sorted = [...animeList].sort((a, b) => b.rating - a.rating);

  return (
    <section className="mb-8">
      {/* Header — clickable to toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 mb-4 px-2 py-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors text-left min-h-[44px]"
      >
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 bg-amber-400 rounded-full inline-block" />
          <h2 className="text-lg sm:text-xl font-bold text-white/90">
            {formatSeason(season)}
          </h2>
          <span className="text-sm text-white/35">
            {animeList.length} 部
          </span>
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-5 text-white/40 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Content — animated collapse */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {sorted.map((anime, index) => (
                <AnimeCard key={anime.id} anime={anime} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
