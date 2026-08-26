import type { Anime } from "@/lib/types";
import type {
  ArchiveFilters,
  ArchiveOptions,
  ArchiveSearchParams,
  ArchiveSeason,
  ArchiveSort,
  ArchiveStats,
  ArchiveYearGroup,
  YearRecap,
} from "./types";

export const DEFAULT_ARCHIVE_FILTERS: ArchiveFilters = {
  q: "",
  year: "",
  season: "",
  tags: [],
  rating: null,
  sort: "rating",
};

export function countActiveArchiveFilters(
  filters: ArchiveFilters,
): number {
  return (
    Number(Boolean(filters.q)) +
    Number(Boolean(filters.year)) +
    Number(Boolean(filters.season)) +
    filters.tags.length +
    Number(filters.rating !== null) +
    Number(filters.sort !== "rating")
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
  const sortValue = readParam(params, "sort")?.trim() ?? "";
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
      ? (seasonValue as ArchiveSeason)
      : "",
    tags,
    rating: parseRating(readParam(params, "rating")),
    sort: ["rating", "title", "added"].includes(sortValue)
      ? (sortValue as ArchiveSort)
      : "rating",
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
  if (filters.sort !== "rating") params.set("sort", filters.sort);
  return params;
}

function compareAnime(a: Anime, b: Anime, sort: ArchiveSort): number {
  if (sort === "title") {
    return a.title.localeCompare(b.title, "zh-CN");
  }
  if (sort === "added") {
    const byCreatedAt =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return byCreatedAt || a.title.localeCompare(b.title, "zh-CN");
  }
  return (
    b.rating - a.rating || a.title.localeCompare(b.title, "zh-CN")
  );
}

function seasonParts(season: string): {
  year: string;
  rank: number;
} {
  const match = season.match(/^(\d{4})(春|夏|秋|冬)$/);
  if (!match) return { year: "其他", rank: 0 };
  const ranks: Record<string, number> = {
    春: 1,
    夏: 4,
    秋: 7,
    冬: 10,
  };
  return { year: match[1], rank: ranks[match[2]] };
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
    .sort((a, b) => compareAnime(a, b, filters.sort));
}

export function groupAnimeByYear(
  data: Anime[],
  sort: ArchiveSort,
): ArchiveYearGroup[] {
  const years = new Map<string, Map<string, Anime[]>>();

  for (const anime of data) {
    const { year } = seasonParts(anime.season);
    const seasons = years.get(year) ?? new Map<string, Anime[]>();
    const records = seasons.get(anime.season) ?? [];
    records.push(structuredClone(anime));
    seasons.set(anime.season, records);
    years.set(year, seasons);
  }

  return Array.from(years.entries())
    .sort(([yearA], [yearB]) => {
      if (yearA === "其他") return 1;
      if (yearB === "其他") return -1;
      return Number(yearB) - Number(yearA);
    })
    .map(([year, seasons]) => ({
      year,
      seasons: Array.from(seasons.entries())
        .sort(([seasonA], [seasonB]) => {
          return seasonParts(seasonB).rank - seasonParts(seasonA).rank;
        })
        .map(([season, records]) => ({
          season,
          records: records.sort((a, b) => compareAnime(a, b, sort)),
        })),
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
      const ratingSum = records.reduce(
        (sum, anime) => sum + (Number.isFinite(anime.rating) ? anime.rating : 0),
        0,
      );
      const averageRating = Math.round((ratingSum / total) * 10) / 10;

      const topAnime = records.reduce<Anime | null>((best, anime) => {
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
      };
    });
}
