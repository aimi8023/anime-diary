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
    <section className="mb-12">
      {/* Header — clickable to toggle with light theme */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full flex items-center justify-between gap-3 mb-6 px-4 py-3 rounded-xl glass hover:bg-white/50 transition-all duration-300 text-left group relative overflow-hidden"
      >
        {/* Background glow on hover - subtle */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/3 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="flex items-center gap-4 relative z-10">
          {/* Animated indicator bar - pink/blue gradient */}
          <motion.span 
            className="w-1.5 h-6 bg-gradient-to-b from-pink-500 to-blue-500 rounded-full inline-block shadow-sm"
            animate={{ 
              boxShadow: isOpen ? "0 0 8px rgba(236,72,153,0.4)" : "0 0 4px rgba(236,72,153,0.2)"
            }}
          />
          
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-pink-600 transition-all">
            {formatSeason(season)}
          </h2>
          
          <span className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white/60 rounded-md border border-white/70 group-hover:border-white/90 group-hover:text-gray-800 transition-all">
            {animeList.length} 部
          </span>
        </div>
        
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="w-5 h-5 text-gray-600 flex-shrink-0 group-hover:text-pink-600 transition-colors relative z-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      {/* Content — animated collapse with enhanced animation */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 pb-2">
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
