import type { Anime } from "@/lib/types";
import { normalizeMarks, toDisplayMarks } from "@/lib/anime/marks";
import { formatSeasonLabel } from "@/lib/season-label";

/**
 * 作品聚合。
 *
 * 档案里同一部作品会因为分季、上下半、剧场版而拆成多条记录——季度归档
 * 需要它们各自独立的播出时间，但标记和「按作品」视图需要它们被视为同一部。
 *
 * 归集规则只有一条：记录上的 `series` 相同即为同一部作品；没有 `series`
 * 的记录自己就是一部完整作品。这样存量数据不需要迁移也能正常工作，
 * 只有需要归集时才写 `series`。
 */
export interface ArchiveWork {
  /** 稳定分组键：作品集名，或独立作品的记录 id。 */
  key: string;
  /** 展示名：作品集名，或独立作品的标题。 */
  name: string;
  /** 归集到该作品的全部条目，按播出档期从早到晚。 */
  records: Anime[];
  /** 是否归集了多个条目（单条即完整作品）。 */
  isGrouped: boolean;
  /** 各条目的标记并集，按内置顺序。 */
  marks: string[];
  /** 已评分条目的平均分；没有已评分条目时为 null。 */
  averageRating: number | null;
  /** 已评分条目数 / 总条目数，用于区分“未评分”与“均分 0”。 */
  ratedCount: number;
  /** 各条目档期的展示串，如 “2016年4月 · 2020年7月”。 */
  seasonLabels: string[];
}

/** 归集分组键。`series` 缺失时该记录自成一组。 */
export function workKey(anime: Anime): string {
  const series = anime.series?.trim();
  return series && series.length > 0 ? series : anime.id;
}

function compareBySeasonAsc(a: Anime, b: Anime): number {
  const rank = (anime: Anime) => {
    const match = anime.season.match(/^(\d{4})(春|夏|秋|冬)$/);
    if (!match) return 0;
    const seasonRank = { 春: 1, 夏: 4, 秋: 7, 冬: 10 }[match[2]] ?? 0;
    return Number(match[1]) * 100 + seasonRank;
  };
  const diff = (rank(a) - rank(b)) || a.title.localeCompare(b.title, "zh-CN");
  return diff;
}

/**
 * 把条目聚合成作品。不修改调用方数组，也不修改其中的记录。
 * 结果按“最早档期”从早到晚排列。
 */
export function groupIntoWorks(records: Anime[]): ArchiveWork[] {
  const buckets = new Map<string, Anime[]>();
  for (const anime of records) {
    const key = workKey(anime);
    const list = buckets.get(key);
    if (list) list.push(anime);
    else buckets.set(key, [anime]);
  }

  const works: ArchiveWork[] = [];
  for (const [key, list] of buckets) {
    const sorted = [...list].sort(compareBySeasonAsc);
    const grouped = sorted.length > 1;
    const rated = sorted.filter(
      (anime) => Number.isFinite(anime.rating) && anime.rating > 0,
    );
    // 标记取并集：同一部作品里任意一条打了就算这部作品打过。
    const marks = normalizeMarks(sorted.flatMap((anime) => anime.marks ?? []));

    works.push({
      key,
      // 归集名优先用 series，否则退回条目标题。
      name: sorted[0].series?.trim() || sorted[0].title,
      records: sorted,
      isGrouped: grouped,
      marks,
      averageRating:
        rated.length > 0
          ? Math.round(
              (rated.reduce((sum, anime) => sum + anime.rating, 0) /
                rated.length) *
                10,
            ) / 10
          : null,
      ratedCount: rated.length,
      seasonLabels: sorted.map((anime) => formatSeasonLabel(anime.season)),
    });
  }

  return works.sort((a, b) => compareBySeasonAsc(a.records[0], b.records[0]));
}

/** 作品视图里展示的标记：并集，未知的旧标记也保留。 */
export function workDisplayMarks(work: ArchiveWork): string[] {
  return toDisplayMarks(work.records.flatMap((anime) => anime.marks ?? []));
}

/**
 * 标记筛选按作品层生效：只要作品里任意一条带该标记，整部作品都保留。
 * 返回命中该作品标记的分组键集合。
 */
export function workKeysMatchingMarks(
  records: Anime[],
  marks: string[],
): Set<string> {
  const keys = new Set<string>();
  if (marks.length === 0) {
    for (const anime of records) keys.add(workKey(anime));
    return keys;
  }
  for (const work of groupIntoWorks(records)) {
    if (marks.every((mark) => work.marks.includes(mark))) {
      keys.add(work.key);
    }
  }
  return keys;
}
