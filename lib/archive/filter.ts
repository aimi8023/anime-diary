import type { Anime } from "@/lib/types";
import { normalizeMarks } from "@/lib/anime/marks";
import { formatSeasonLabel } from "@/lib/season-label";
import type { ArchiveWork } from "./works";
import {
  onlyGroupedWorks,
  onlySoloRecords,
  workKey,
  workKeysMatchingMarks,
} from "./works";
import type {
  ArchiveCardGroup,
  ArchiveDirection,
  ArchiveFilters,
  ArchiveGroup,
  ArchiveOptions,
  ArchiveSearchParams,
  ArchiveStats,
} from "./types";

export const DEFAULT_ARCHIVE_FILTERS: ArchiveFilters = {
  q: "",
  year: "",
  season: "",
  marks: [],
  rating: null,
  scope: "solo",
  group: "season",
  direction: "desc",
};

// 排序是浏览偏好而非筛选条件：不写入活动筛选数，
// 也不在工具栏生成可移除的 chip（它有常驻的快切控件）。
export function countActiveArchiveFilters(
  filters: ArchiveFilters,
): number {
  return (
    Number(Boolean(filters.q)) +
    Number(Boolean(filters.year)) +
    Number(Boolean(filters.season)) +
    filters.marks.length +
    Number(filters.rating !== null)
  );
}

function readParam(
  params: ArchiveSearchParams | URLSearchParams,
  key: string,
): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseRating(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const clamped = Math.min(10, Math.max(1, parsed));
  return Math.round(clamped * 2) / 2;
}

export function parseArchiveFilters(
  params: ArchiveSearchParams | URLSearchParams,
): ArchiveFilters {
  const yearValue = readParam(params, "year")?.trim() ?? "";
  const seasonValue = readParam(params, "season")?.trim() ?? "";
  const groupValue = readParam(params, "group")?.trim() ?? "";
  const dirValue = readParam(params, "dir")?.trim() ?? "";
  const marks = normalizeMarks(
    (readParam(params, "mark") ?? "")
      .split(",")
      .map((mark) => mark.trim())
      .filter(Boolean),
  );
  const scopeValue = readParam(params, "scope")?.trim() ?? "";

  return {
    q: readParam(params, "q")?.trim() ?? "",
    year: /^\d{4}$/.test(yearValue) ? yearValue : "",
    season: ["春", "夏", "秋", "冬"].includes(seasonValue)
      ? (seasonValue as ArchiveFilters["season"])
      : "",
    marks,
    rating: parseRating(readParam(params, "rating")),
    // 单作是默认分类：绝大多数记录本身就是一部完整作品。
    scope: scopeValue === "work" ? "work" : "solo",
    // 兼容旧版参数：group=year 与旧 sort 值都归入季度维度。
    group: groupValue === "rating" ? "rating" : "season",
    direction: dirValue === "asc" ? "asc" : "desc",
  };
}

export function serializeArchiveFilters(
  filters: ArchiveFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.year) params.set("year", filters.year);
  if (filters.season) params.set("season", filters.season);
  if (filters.marks.length > 0) params.set("mark", filters.marks.join(","));
  if (filters.rating !== null) params.set("rating", String(filters.rating));
  // 单作是默认值，不写入 URL。
  if (filters.scope !== "solo") params.set("scope", filters.scope);
  if (filters.group !== "season") params.set("group", filters.group);
  if (filters.direction !== "desc") params.set("dir", filters.direction);
  return params;
}

const SEASON_RANK: Record<string, number> = {
  春: 1,
  夏: 4,
  秋: 7,
  冬: 10,
};

const byTitle = (a: Anime, b: Anime) =>
  a.title.localeCompare(b.title, "zh-CN");

// 季度排序键：年份×100 + 季节序号（春=1/夏=4/秋=7/冬=10），
// 使“2025年1月”整体大于“2024年10月”。
function seasonSortKey(season: string): number {
  const parts = seasonParts(season);
  if (parts.year === "其他") return 0;
  return Number(parts.year) * 100 + parts.rank;
}

function bySeason(a: Anime, b: Anime, flip: number): number {
  const keyA = seasonSortKey(a.season);
  const keyB = seasonSortKey(b.season);
  // 缺失季度的记录固定垫底。
  if (keyA === 0 && keyB === 0) return 0;
  if (keyA === 0) return 1;
  if (keyB === 0) return -1;
  return (keyA - keyB) * flip;
}

function compareByGroup(
  a: Anime,
  b: Anime,
  group: ArchiveGroup,
  direction: ArchiveDirection,
): number {
  const flip = direction === "asc" ? 1 : -1;
  if (group === "rating") {
    // 同分档内按播出档期排序，评分组也能按时间线浏览。
    return (a.rating - b.rating) * flip || bySeason(a, b, flip) || byTitle(a, b);
  }
  return bySeason(a, b, flip) || byTitle(a, b);
}

function seasonParts(season: string): {
  year: string;
  rank: number;
} {
  const match = season.match(/^(\d{4})(春|夏|秋|冬)$/);
  if (!match) return { year: "其他", rank: 0 };
  return { year: match[1], rank: SEASON_RANK[match[2]] ?? 0 };
}

export function filterAnime(
  data: Anime[],
  filters: ArchiveFilters,
): Anime[] {
  const query = filters.q.trim().toLocaleLowerCase("zh-CN");

  return data
    .filter((anime) => {
      const parts = seasonParts(anime.season);
      if (filters.year && parts.year !== filters.year) return false;
      if (filters.season && !anime.season.endsWith(filters.season)) {
        return false;
      }
      if (filters.rating !== null && anime.rating < filters.rating) {
        return false;
      }
      if (!query) return true;

      const searchable = [anime.title, anime.originalTitle ?? "", anime.comment]
        .join("\n")
        .toLocaleLowerCase("zh-CN");
      return searchable.includes(query);
    })
    .sort((a, b) =>
      compareByGroup(a, b, filters.group, filters.direction),
    );
}

/**
 * 条目级条件（关键词、年份、季度、最低评分）之后、顶层分类之前的中间结果。
 * 标记在这一层生效：作品里任意条目带标记即整部作品保留。
 */
function entriesWithinMarks(data: Anime[], filters: ArchiveFilters): Anime[] {
  const entryMatches = filterAnime(data, { ...filters, marks: [] });
  if (filters.marks.length === 0) return entryMatches;
  const matched = workKeysMatchingMarks(entryMatches, filters.marks);
  return entryMatches.filter((anime) => matched.has(workKey(anime)));
}

/**
 * 两个分类各自的命中数。必须在顶层分类收敛之前统计，否则「作品」分类下
 * 永远只能看到已经筛成单作的结果，计数会恒为 0。
 */
export function countArchiveScopes(
  data: Anime[],
  filters: ArchiveFilters,
): { solo: number; work: number } {
  const scoped = entriesWithinMarks(data, filters);
  return {
    solo: onlySoloRecords(scoped).length,
    work: onlyGroupedWorks(scoped).length,
  };
}

/**
 * 作品层筛选：顶层分类决定看哪一类，其余条件都作用到作品上——
 * 作品里任意条目命中，整部作品都保留。
 *
 * 返回值仍是以条目为单位的数组，供统计与详情导航使用。
 */
export function filterAnimeByWorks(
  data: Anime[],
  filters: ArchiveFilters,
): Anime[] {
  const scoped = entriesWithinMarks(data, filters);
  if (filters.scope === "solo") return onlySoloRecords(scoped);
  const keep = new Set(
    onlyGroupedWorks(scoped).flatMap((work) =>
      work.records.map((anime) => anime.id),
    ),
  );
  return scoped.filter((anime) => keep.has(anime.id));
}

/**
 * 把筛选结果切成横向卡片行：
 * - 季度维度：一行一个播出档期（“2024年4月”“2024年1月”…，“其他”始终最后）；
 * - 评分维度：一行一个评分档（10.0、9.5、9.0…），不按档期分割。
 * 不修改调用方数组。
 */
export function groupArchive(
  data: Anime[],
  filters: Pick<ArchiveFilters, "group" | "direction">,
): ArchiveCardGroup[] {
  const flip = filters.direction === "asc" ? 1 : -1;
  const buckets = new Map<string, { sortKey: number; records: Anime[] }>();

  for (const anime of data) {
    const key =
      filters.group === "season"
        ? /^\d{4}[春夏秋冬]$/.test(anime.season)
          ? anime.season
          : "其他"
        : String(anime.rating);
    const sortKey =
      filters.group === "season"
        ? seasonSortKey(anime.season)
        : Number(anime.rating);
    const bucket = buckets.get(key) ?? { sortKey, records: [] };
    bucket.records.push(anime);
    buckets.set(key, bucket);
  }
  return Array.from(buckets.entries())
    .sort(([, a], [, b]) => {
      if (a.sortKey === 0) return 1;
      if (b.sortKey === 0) return -1;
      return (a.sortKey - b.sortKey) * flip;
    })
    .map(([key, bucket]) => ({
      key,
      label:
        filters.group === "season"
          ? key === "其他"
            ? "其他"
            : formatSeasonLabel(key)
          : key === "0"
            ? "未评分"
            : `★ ${Number(key).toFixed(1)}`,
      records: [...bucket.records].sort((a, b) =>
        compareByGroup(a, b, filters.group, filters.direction),
      ),
      works: [],
    }));
}

/**
 * 「作品」分类下的排列：一部作品一组。
 * 季度维度按最新档期，评分维度按最高分，方向与工具栏一致。
 */
export function groupWorksByOrder(
  works: ArchiveWork[],
  filters: Pick<ArchiveFilters, "group" | "direction">,
): ArchiveCardGroup[] {
  const flip = filters.direction === "asc" ? 1 : -1;
  const buckets = new Map<string, { sortKey: number; works: ArchiveWork[] }>();

  for (const work of works) {
    const key = filters.group === "rating" ? `★${work.maxRating ?? "未评分"}` : work.latestSeason;
    const sortKey =
      filters.group === "rating"
        ? (work.maxRating ?? -1)
        : seasonSortKey(work.latestSeason);
    const bucket = buckets.get(key) ?? { sortKey, works: [] };
    bucket.works.push(work);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([, a], [, b]) => {
      if (a.sortKey === 0) return 1;
      if (b.sortKey === 0) return -1;
      return (a.sortKey - b.sortKey) * flip;
    })
    .map(([key, bucket]) => ({
      key,
      label:
        filters.group === "rating"
          ? key === "★未评分"
            ? "未评分"
            : `★ ${Number(key.slice(1)).toFixed(1)}`
          : formatSeasonLabel(key),
      // 每组内再按作品名排，保证同一行内顺序稳定。
      records: bucket.works
        .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
        .map((work) => work.records[0]),
      works: bucket.works.sort((a, b) =>
        a.name.localeCompare(b.name, "zh-CN"),
      ),
    }));
}

export function getArchiveOptions(data: Anime[]): ArchiveOptions {  const years = Array.from(
    new Set(
      data
        .map((anime) => seasonParts(anime.season).year)
        .filter((year) => year !== "其他"),
    ),
  ).sort((a, b) => Number(b) - Number(a));
  return { years };
}

export function getArchiveStats(data: Anime[]): ArchiveStats {
  const years = getArchiveOptions(data).years;
  return {
    total: data.length,
    seasonCount: new Set(data.map((anime) => anime.season)).size,
    earliestYear: years.length > 0 ? years[years.length - 1] : null,
    latestYear: years[0] ?? null,
  };
}
