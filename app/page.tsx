"use client";

import { storage } from "@/lib/storage-factory";
import SeasonSection from "@/components/season-section";
import Timer from "@/components/timer";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Anime } from "@/lib/types";

export default function HomePage() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/anime");
        const data = await res.json();
        setAnimeList(data);
      } catch (error) {
        console.error("Failed to fetch anime:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter by search query
  const filteredList = searchQuery.trim()
    ? animeList.filter((anime) =>
        anime.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : animeList;

  // Group by season
  const grouped = filteredList.reduce<Record<string, typeof filteredList>>((acc, anime) => {
    if (!acc[anime.season]) acc[anime.season] = [];
    acc[anime.season].push(anime);
    return acc;
  }, {});

  // Sort seasons descending
  const sortedSeasons = Object.keys(grouped).sort((a, b) => {
    const extract = (s: string) => {
      const match = s.match(/^(\d{4})(春|夏|秋|冬)$/);
      if (!match) return 0;
      const seasonOrder: Record<string, number> = { 冬: 0, 春: 1, 夏: 2, 秋: 3 };
      return parseInt(match[1]) * 10 + seasonOrder[match[2]];
    };
    return extract(b) - extract(a);
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-600 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
      {/* Hero — Premium Glass with Gradient Text */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-14 sm:mb-16 pb-8 relative"
      >
        {/* Background glow - subtle */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/3 via-transparent to-blue-500/3 blur-3xl pointer-events-none" />
        
        {/* Timer Component */}
        <div className="relative mb-6">
          <Timer />
        </div>
        
        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: showSearch ? 1 : 0, height: showSearch ? "auto" : 0 }}
          transition={{ duration: 0.3 }}
          className="relative max-w-md mx-auto mb-6 overflow-hidden"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索番剧名称..."
            className="w-full px-4 py-2.5 rounded-full glass-input text-sm focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              
            </button>
          )}
        </motion.div>
        
        {/* Stats */}
        {animeList.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="relative inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass"
          >
            {/* Search Toggle Button */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/50 hover:bg-white/70 transition-colors text-sm text-gray-700 font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              搜索
            </button>
            
            <div className="w-px h-5 bg-gray-300" />
            
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span className="text-sm text-gray-700">共</span>
              <span className="text-lg font-bold text-pink-600">{animeList.length}</span>
              <span className="text-sm text-gray-700">部</span>
            </div>
            <div className="w-px h-5 bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-gray-700">{sortedSeasons.length}</span>
              <span className="text-sm text-gray-700">个季度</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Empty state — Light theme */}
      {animeList.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-24"
        >
          <div className="text-7xl mb-6 animate-bounce">🍃</div>
          <p className="text-gray-800 text-xl mb-3 font-semibold">还没有记录任何番剧</p>
          <p className="text-gray-600 text-sm">
            前往管理页添加你的第一部番剧吧
          </p>
        </motion.div>
      )}

      {/* No search results */}
      {searchQuery && filteredList.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="text-6xl mb-4"></div>
          <p className="text-gray-700 text-lg font-medium mb-2">未找到相关番剧</p>
          <p className="text-gray-500 text-sm">试试其他关键词吧</p>
        </motion.div>
      )}

      {/* Season sections */}
      {sortedSeasons.map((season) => (
        <SeasonSection
          key={season}
          season={season}
          animeList={grouped[season]}
        />
      ))}

      {/* Bottom padding for mobile */}
      <div className="h-12 sm:hidden" />
    </div>
  );
}
