"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch } from "./search-context";

type FilterType = "all" | "name" | "year" | "tag" | "rating";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "name", label: "名称" },
  { value: "year", label: "年份" },
  { value: "tag", label: "标签" },
  { value: "rating", label: "评分" },
];

export default function SearchFilter() {
  const {
    isSearchOpen, setIsSearchOpen,
    searchValue, setSearchValue,
    filterType, setFilterType,
    animeList, setAnimeList,
    setFilteredList,
    setHasActiveSearch,
  } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch anime data on mount
  useEffect(() => {
    fetch("/api/anime")
      .then((res) => res.json())
      .then((data) => {
        setAnimeList(data);
        setFilteredList(data);
      })
      .catch(() => {
        setAnimeList([]);
        setFilteredList([]);
      });
  }, [setAnimeList, setFilteredList]);

  // Auto focus input when search opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  const performSearch = useCallback(
    (query: string, type: FilterType) => {
      if (!animeList.length) return;

      if (!query.trim()) {
        setFilteredList(animeList);
        return;
      }

      let filtered = [...animeList];
      const q = query.toLowerCase();

      switch (type) {
        case "all":
          filtered = filtered.filter(
            (anime) =>
              anime.title.toLowerCase().includes(q) ||
              (anime.tags && anime.tags.some((t) => t.toLowerCase().includes(q)))
          );
          break;
        case "name":
          filtered = filtered.filter((anime) => anime.title.toLowerCase().includes(q));
          break;
        case "year":
          filtered = filtered.filter((anime) => {
            const match = anime.season.match(/^(\d{4})/);
            return match && match[1] === query;
          });
          break;
        case "tag":
          filtered = filtered.filter(
            (anime) => anime.tags && anime.tags.some((t) => t.toLowerCase().includes(q))
          );
          break;
        case "rating":
          const minRating = parseFloat(query);
          if (!isNaN(minRating)) {
            filtered = filtered.filter((anime) => anime.rating >= minRating);
          }
          break;
      }

      setFilteredList(filtered);
    },
    [animeList, setFilteredList]
  );

  const handleSearch = () => {
    setHasActiveSearch(true);
    performSearch(searchValue, filterType);
  };

  const handleReset = () => {
    setSearchValue("");
    setFilterType("all");
    setHasActiveSearch(false);
    setFilteredList(animeList);
  };

  const handleClose = useCallback(() => {
    setIsSearchOpen(false);
  }, [setIsSearchOpen]);

  const getPlaceholder = () => {
    switch (filterType) {
      case "all":
        return "搜索番剧名称或标签...";
      case "name":
        return "输入番剧名称...";
      case "year":
        return "例如：2024";
      case "tag":
        return "输入标签关键词...";
      case "rating":
        return "最低评分，如：8.5";
      default:
        return "搜索...";
    }
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Search Panel */}
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              duration: 0.3,
            }}
            className="fixed inset-x-0 top-0 z-[60] p-4 sm:p-6 pointer-events-none"
          >
            <div className="max-w-xl mx-auto pointer-events-auto">
              <div className="glass rounded-2xl shadow-2xl backdrop-blur-xl border border-white/50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50">
                  <h3 className="text-base font-semibold text-gray-900">搜索</h3>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg hover:bg-gray-100/50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Search Area */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {/* Filter Type Dropdown */}
                    <div className="relative">
                      <select
                        value={filterType}
                        onChange={(e) => {
                          setFilterType(e.target.value as FilterType);
                          setSearchValue("");
                        }}
                        className="appearance-none bg-white/60 hover:bg-white/80 border border-white/60 rounded-lg px-3 py-2.5 pr-8 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/30 cursor-pointer transition-all"
                      >
                        {FILTER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-white text-gray-900">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Search Input */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch();
                      }}
                      placeholder={getPlaceholder()}
                      className="flex-1 px-4 py-2.5 rounded-lg glass-input text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 transition-all"
                    />

                    {/* Search Button */}
                    <button
                      onClick={handleSearch}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 active:from-pink-700 active:to-blue-700 text-white text-sm font-medium transition-all shadow-md hover:shadow-lg active:shadow-sm active:scale-95"
                      aria-label="搜索"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Quick Tags */}
                  {filterType === "tag" && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {Array.from(new Set(animeList.flatMap((a) => a.tags || [])))
                        .slice(0, 8)
                        .map((tag) => (
                          <button
                            key={tag}
                            onClick={() => {
                              setSearchValue(tag);
                              performSearch(tag, "tag");
                            }}
                            className="px-3 py-1 rounded-full bg-white/50 hover:bg-white/80 border border-white/60 text-xs text-gray-700 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 pb-4 flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    {filterType === "all"
                      ? "选择筛选方式开始搜索"
                      : `按${FILTER_OPTIONS.find((o) => o.value === filterType)?.label}筛选`}
                  </span>
                  {searchValue && (
                    <button onClick={handleReset} className="text-xs text-gray-600 hover:text-gray-900 underline">
                      清除筛选
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
