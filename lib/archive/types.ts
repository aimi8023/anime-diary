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

export interface YearRecap {
  year: string;
  total: number;
  /** 年度平均分，保留一位小数。 */
  averageRating: number;
  /** 年度最高分作品；并列时取标题顺序靠前者。 */
  topAnime: { title: string; rating: number } | null;
  /** 出现最多的标签，至多 3 个；并列时按标题顺序。 */
  topTags: string[];
}
