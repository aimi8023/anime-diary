"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

interface ArchiveSearchContextValue {
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const ArchiveSearchContext =
  createContext<ArchiveSearchContextValue | null>(null);

export function ArchiveSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const value = useMemo(
    () => ({
      isSearchOpen,
      openSearch: () => setSearchOpen(true),
      closeSearch: () => setSearchOpen(false),
    }),
    [isSearchOpen],
  );

  return (
    <ArchiveSearchContext.Provider value={value}>
      {children}
    </ArchiveSearchContext.Provider>
  );
}

export function useArchiveSearch(): ArchiveSearchContextValue {
  const context = useContext(ArchiveSearchContext);
  if (!context) {
    throw new Error(
      "useArchiveSearch must be used within ArchiveSearchProvider",
    );
  }
  return context;
}
