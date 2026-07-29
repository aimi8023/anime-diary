import type { Anime } from "@/lib/types";

export type ArchiveSort = "rating" | "title" | "added";
export type ArchiveSeason = "" | "春" | "夏" | "秋" | "冬";
export type ArchiveSearchParams = Record<
  string,
  string | string[] | undefined
>;

export interface ArchiveFilters {
  q: string;
  year: string;
  season: ArchiveSeason;
  tags: string[];
  rating: number | null;
  sort: ArchiveSort;
}

export interface ArchiveSeasonGroup {
  season: string;
  records: Anime[];
}

export interface ArchiveYearGroup {
  year: string;
  seasons: ArchiveSeasonGroup[];
}

export interface ArchiveStats {
  total: number;
  seasonCount: number;
  earliestYear: string | null;
  latestYear: string | null;
}

export interface ArchiveOptions {
  years: string[];
  tags: string[];
}
