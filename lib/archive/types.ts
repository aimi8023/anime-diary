import type { Anime } from "@/lib/types";

/** 档案的排列维度：按播出季度（1/4/7/10 月档期）、按评分分段。 */
export type ArchiveGroup = "season" | "rating";
/** 组间与组内的排列方向。 */
export type ArchiveDirection = "asc" | "desc";

export type ArchiveSearchParams = Record<
  string,
  string | string[] | undefined
>;

export interface ArchiveFilters {
  q: string;
  year: string;
  season: "" | "春" | "夏" | "秋" | "冬";
  tags: string[];
  rating: number | null;
  group: ArchiveGroup;
  direction: ArchiveDirection;
}

/** 排列后的一个横向卡片行。 */
export interface ArchiveCardGroup {
  key: string;
  label: string;
  records: Anime[];
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
  /** 年度平均分，保留一位小数；该年没有已评分记录时为 null。 */
  averageRating: number | null;
  /** 年度最高分作品；并列时取标题顺序靠前者。 */
  topAnime: { title: string; rating: number } | null;
  /** 出现最多的标签，至多 3 个；并列时按标题顺序。 */
  topTags: string[];
  /** 年度总话数（不含未知话数）。 */
  episodesTotal: number;
  /** 9 分及以上的记录数。 */
  topRatedCount: number;
  /** 各季度部数，按春/夏/秋/冬排列，只含有记录的季度。 */
  seasonCounts: Array<{ season: string; count: number }>;
}
