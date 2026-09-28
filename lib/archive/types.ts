import type { Anime } from "@/lib/types";
import type { ArchiveWork } from "./works";

/** 档案的排列维度：按播出季度（1/4/7/10 月档期）、按评分分段。 */
export type ArchiveGroup = "season" | "rating";
/**
 * 顶层分类：单作 = 没有归集的独立作品；作品 = 归集了分季/上下半/剧场版的作品。
 * 每个番都是作品，区别只在于它是一条还是多条归在一起。
 */
export type ArchiveScope = "solo" | "work";
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
  marks: string[];
  rating: number | null;
  scope: ArchiveScope;
  group: ArchiveGroup;
  direction: ArchiveDirection;
}

/** 排列后的一个横向卡片行。`works` 只在「作品」分类下非空。 */
export interface ArchiveCardGroup {
  key: string;
  label: string;
  records: Anime[];
  works: ArchiveWork[];
}

export interface ArchiveStats {
  total: number;
  seasonCount: number;
  earliestYear: string | null;
  latestYear: string | null;
}

export interface ArchiveOptions {
  years: string[];
}
