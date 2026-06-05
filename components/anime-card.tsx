"use client";

import { motion } from "framer-motion";
import type { Anime } from "@/lib/types";
import StarRating from "./star-rating";
import StatusBadge from "./status-badge";

interface AnimeCardProps {
  anime: Anime;
  index: number;
}

export default function AnimeCard({ anime, index }: AnimeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="group glass rounded-xl overflow-hidden hover:-translate-y-1 hover:bg-white/[0.12] hover:border-white/20 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 ease-in-out"
    >
      {/* Cover Image */}
      <div className="aspect-[3/4] bg-white/5 relative overflow-hidden">
        {anime.cover ? (
          <img
            src={anime.cover}
            alt={anime.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={anime.status} />
        </div>
        {/* Rating overlay on cover */}
        <div className="absolute bottom-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-black/50 backdrop-blur-sm text-amber-400 border border-white/10">
            ⭐ {anime.rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-white/90 truncate" title={anime.title}>
          {anime.title}
        </h3>
        <div className="mt-1.5">
          <StarRating rating={anime.rating} />
        </div>
        {anime.comment && (
          <p className="mt-2 text-xs text-white/45 line-clamp-2 leading-relaxed">
            {anime.comment}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between text-xs text-white/30">
          <span>{anime.season}</span>
          {anime.episodes > 0 && <span>{anime.episodes} 话</span>}
        </div>
      </div>
    </motion.div>
  );
}
