"use client";

import { motion } from "framer-motion";
import type { Anime } from "@/lib/types";
import StarRating from "./star-rating";

interface AnimeCardProps {
  anime: Anime;
  index: number;
}

export default function AnimeCard({ anime, index }: AnimeCardProps) {
  // Dynamic glow color based on rating - Light theme
  const getGlowColor = () => {
    if (anime.rating >= 9) return "from-pink-500/20 to-rose-500/20";
    if (anime.rating >= 7) return "from-blue-400/15 to-cyan-400/15";
    return "from-gray-300/10 to-slate-300/10";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ 
        y: -8, 
        scale: 1.03,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.05,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="group relative"
    >
      {/* Glow effect background */}
      <div className={`absolute -inset-0.5 bg-gradient-to-br ${getGlowColor()} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      {/* Main card */}
      <div className="relative glass rounded-xl overflow-hidden transition-all duration-400">
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none z-10" />
        
        {/* Cover Image */}
        <div className="aspect-[3/4] bg-gradient-to-br from-white/10 to-white/30 relative overflow-hidden">
          {anime.cover ? (
            <>
              <img
                src={anime.cover}
                alt={anime.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400/60 bg-gradient-to-br from-blue-500/5 to-pink-500/5">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-4 relative flex flex-col min-h-[200px]">
          {/* Title with gradient underline */}
          <h3 className="font-bold text-base text-gray-900 truncate mb-1 group-hover:text-pink-600 transition-colors" title={anime.title}>
            {anime.title}
          </h3>
          <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-pink-500 to-blue-500 transition-all duration-300" />
          
          {/* Star Rating */}
          <div className="mt-2">
            <StarRating rating={anime.rating} />
          </div>
          
          {/* Comment with better styling - fixed height for 2 lines */}
          <div className="mt-3 flex-grow">
            {anime.comment ? (
              <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed italic border-l-2 border-blue-300 pl-3 h-10 overflow-hidden">
                "{anime.comment}"
              </p>
            ) : (
              <div className="h-10" />
            )}
          </div>
          
          {/* Meta info - always at bottom */}
          <div className="mt-auto pt-3 flex items-center justify-between text-xs">
            <span className="px-2 py-1 rounded-lg bg-white/20 text-gray-700 border border-white/10 font-medium">
              {anime.season}
            </span>
            {anime.episodes > 0 && (
              <span className="px-2 py-1 rounded-lg bg-white/20 text-gray-700 border border-white/10 font-medium">
                 {anime.episodes} 话
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
