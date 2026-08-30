import type { Anime } from "@/lib/types";
import { formatSeasonLabel } from "@/lib/season-label";
import type {
  ArchiveCardGroup,
  ArchiveDirection,
  ArchiveFilters,
  ArchiveGroup,
  ArchiveOptions,
  ArchiveSearchParams,
  ArchiveStats,
  YearRecap,
} from "./types";

export const DEFAULT_ARCHIVE_FILTERS: ArchiveFilters = {
  q: "",
  year: "",
  season: "",
  tags: [],
  rating: null,
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
    filters.tags.length +
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
  const tags = Array.from(
    new Set(
      (readParam(params, "tag") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );

  return {
    q: readParam(params, "q")?.trim() ?? "",
    year: /^\d{4}$/.test(yearValue) ? yearValue : "",
    season: ["春", "夏", "秋", "冬"].includes(seasonValue)
      ? (seasonValue as ArchiveFilters["season"])
      : "",
    tags,
    rating: parseRating(readParam(params, "rating")),
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
  if (filters.tags.length > 0) params.set("tag", filters.tags.join(","));
  if (filters.rating !== null) params.set("rating", String(filters.rating));
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
      if (
        filters.tags.length > 0 &&
        !filters.tags.every((tag) => anime.tags.includes(tag))
      ) {
        return false;
      }
      if (filters.rating !== null && anime.rating < filters.rating) {
        return false;
      }
      if (!query) return true;

      const searchable = [
        anime.title,
        anime.originalTitle ?? "",
        anime.comment,
        ...anime.tags,
      ]
        .join("\n")
        .toLocaleLowerCase("zh-CN");
      return searchable.includes(query);
    })
    .sort((a, b) =>
      compareByGroup(a, b, filters.group, filters.direction),
    );
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
    }));
}

export function getArchiveOptions(data: Anime[]): ArchiveOptions {
  const years = Array.from(
    new Set(
      data
        .map((anime) => seasonParts(anime.season).year)
        .filter((year) => year !== "其他"),
    ),
  ).sort((a, b) => Number(b) - Number(a));
  const tags = Array.from(
    new Set(data.flatMap((anime) => anime.tags)),
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  return { years, tags };
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

/**
 * 年度回顾：按年聚合部数、平均分、最高分作品与高频标签。
 * 季度缺失（“其他”）的记录不参与年度聚合；不修改调用方数组。
 */
export function getYearlyRecap(data: Anime[]): YearRecap[] {
  const byYear = new Map<string, Anime[]>();
  for (const anime of data) {
    const { year } = seasonParts(anime.season);
    if (year === "其他") continue;
    const records = byYear.get(year) ?? [];
    records.push(anime);
    byYear.set(year, records);
  }

  return Array.from(byYear.entries())
    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
    .map(([year, records]) => {
      const total = records.length;
      // 未评分（rating 0）不参与均分统计。
      const ratedRecords = records.filter(
        (anime) => Number.isFinite(anime.rating) && anime.rating > 0,
      );
      const ratingSum = ratedRecords.reduce(
        (sum, anime) => sum + anime.rating,
        0,
      );
      const averageRating =
        ratedRecords.length > 0
          ? Math.round((ratingSum / ratedRecords.length) * 10) / 10
          : null;

      const episodesTotal = records.reduce(
        (sum, anime) =>
          sum + (Number.isInteger(anime.episodes) && anime.episodes > 0
            ? anime.episodes
            : 0),
        0,
      );
      const topRatedCount = records.filter(
        (anime) => Number.isFinite(anime.rating) && anime.rating >= 9,
      ).length;

      const countsBySeason = new Map<string, number>();
      for (const anime of records) {
        const match = anime.season.match(/^(?:\d{4})([春夏秋冬])$/);
        const seasonName = match?.[1];
        if (!seasonName) continue;
        countsBySeason.set(
          seasonName,
          (countsBySeason.get(seasonName) ?? 0) + 1,
        );
      }
      const seasonCounts = (["春", "夏", "秋", "冬"] as const)
        .filter((season) => countsBySeason.has(season))
        .map((season) => ({
          season,
          count: countsBySeason.get(season) ?? 0,
        }));

      const topAnime = records.reduce<Anime | null>((best, anime) => {
        if (!Number.isFinite(anime.rating) || anime.rating <= 0) return best;
        if (!best) return anime;
        if (anime.rating > best.rating) return anime;
        if (
          anime.rating === best.rating &&
          anime.title.localeCompare(best.title, "zh-CN") < 0
        ) {
          return anime;
        }
        return best;
      }, null);

      const tagCounts = new Map<string, number>();
      for (const anime of records) {
        for (const tag of anime.tags ?? []) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
      const topTags = Array.from(tagCounts.entries())
        .sort(([tagA, countA], [tagB, countB]) =>
          countB - countA || tagA.localeCompare(tagB, "zh-CN"))
        .slice(0, 3)
        .map(([tag]) => tag);

      return {
        year,
        total,
        averageRating,
        topAnime: topAnime
          ? { title: topAnime.title, rating: topAnime.rating }
          : null,
        topTags,
        episodesTotal,
        topRatedCount,
        seasonCounts,
      };
    });
}
