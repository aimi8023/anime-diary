"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Anime } from "@/lib/types";

type FilterType = "all" | "name" | "year" | "tag" | "rating";

interface SearchContextType {
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  animeList: Anime[];
  setAnimeList: (list: Anime[]) => void;
  filteredList: Anime[];
  setFilteredList: (list: Anime[]) => void;
  hasActiveSearch: boolean;
  setHasActiveSearch: (active: boolean) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [filteredList, setFilteredList] = useState<Anime[]>([]);
  const [hasActiveSearch, setHasActiveSearch] = useState(false);

  return (
    <SearchContext.Provider
      value={{
        isSearchOpen,
        setIsSearchOpen,
        searchValue,
        setSearchValue,
        filterType,
        setFilterType,
        animeList,
        setAnimeList,
        filteredList,
        setFilteredList,
        hasActiveSearch,
        setHasActiveSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}
