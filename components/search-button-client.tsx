"use client";

import { useSearch } from "./search-context";

export default function SearchButtonClient() {
  const { setIsSearchOpen } = useSearch();

  return (
    <button
      onClick={() => setIsSearchOpen(true)}
      className="p-2 rounded-full bg-white/50 hover:bg-white/70 transition-all duration-300 active:scale-95 group"
      title="搜索番剧"
    >
      <svg 
        className="w-5 h-5 text-gray-700 group-hover:text-pink-600 transition-colors" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
        />
      </svg>
    </button>
  );
}
