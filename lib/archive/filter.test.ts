import { describe, expect, it } from "vitest";
import type { Anime } from "@/lib/types";
import {
  countActiveArchiveFilters,
  DEFAULT_ARCHIVE_FILTERS,
  filterAnime,
  getArchiveOptions,
  getArchiveStats,
  getYearlyRecap,
  groupArchive,
  parseArchiveFilters,
  serializeArchiveFilters,
} from "./filter";

const records: Anime[] = [
  {
    id: "anime-1",
    title: "孤独摇滚！",
    originalTitle: "ぼっち・ざ・ろっく！",
    season: "2024夏",
    cover: "",
    rating: 9,
    comment: "喜欢乐队成长的过程",
    episodes: 12,
    tags: ["音乐", "日常"],
    createdAt: "2024-07-01T00:00:00.000Z",
  },
  {
    id: "anime-2",
    title: "摇曳露营",
    season: "2024夏",
    cover: "",
    rating: 8.5,
    comment: "适合放松",
    episodes: 12,
    tags: ["日常", "治愈"],
    createdAt: "2024-08-01T00:00:00.000Z",
  },
  {
    id: "anime-3",
    title: "葬送的芙莉莲",
    season: "2025春",
    cover: "",
    rating: 9.5,
    comment: "关于时间与记忆",
    episodes: 28,
    tags: ["奇幻", "治愈"],
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "anime-4",
    title: "命运石之门",
    season: "2024冬",
    cover: "",
    rating: 10,
    comment: "",
    episodes: 24,
    tags: ["科幻"],
    createdAt: "2024-10-01T00:00:00.000Z",
  },
];

describe("archive active filter count", () => {
  it("counts every effective filter including individual tags, excluding sort preference", () => {
    expect(countActiveArchiveFilters(DEFAULT_ARCHIVE_FILTERS)).toBe(0);
    expect(
      countActiveArchiveFilters({
        ...DEFAULT_ARCHIVE_FILTERS,
        q: "音乐",
        year: "2024",
        tags: ["日常", "治愈"],
      }),
    ).toBe(4);
  });
});

describe("archive filter URL state", () => {
  it("parses supported URL values and normalizes them", () => {
    expect(
      parseArchiveFilters({
        q: "  音乐  ",
        year: "2024",
        season: "夏",
        tag: "治愈,日常,治愈",
        rating: "8.3",
        sort: "title",
      }),
    ).toEqual({
      q: "音乐",
      year: "2024",
      season: "夏",
      tags: ["治愈", "日常"],
      rating: 8.5,
      group: "season",
      direction: "desc",
    });
  });

  it("parses group and direction values", () => {
    expect(
      parseArchiveFilters({ group: "rating", dir: "asc" }),
    ).toMatchObject({ group: "rating", direction: "asc" });
  });

  it("maps legacy grouping parameters onto the season dimension", () => {
    expect(parseArchiveFilters({ group: "year" })).toMatchObject({
      group: "season",
    });
    expect(parseArchiveFilters({ sort: "added" })).toMatchObject({
      group: "season",
    });
  });

  it("ignores invalid values and uses safe defaults", () => {
    expect(
      parseArchiveFilters({
        year: "24",
        season: "雨",
        rating: "many",
        group: "unknown",
        dir: "sideways",
      }),
    ).toEqual(DEFAULT_ARCHIVE_FILTERS);
  });

  it("reads the first value when a server query parameter is repeated", () => {
    expect(
      parseArchiveFilters({
        year: ["2025", "2024"],
        season: ["秋", "夏"],
      }),
    ).toMatchObject({
      year: "2025",
      season: "秋",
    });
  });

  it("parses URLSearchParams with the same rules", () => {
    const params = new URLSearchParams(
      "q=%E4%B9%90%E9%98%9F&year=2023&rating=10&group=rating&dir=asc",
    );

    expect(parseArchiveFilters(params)).toMatchObject({
      q: "乐队",
      year: "2023",
      rating: 10,
      group: "rating",
      direction: "asc",
    });
  });

  it("serializes only non-default filters in a stable order", () => {
    expect(
      serializeArchiveFilters({
        ...DEFAULT_ARCHIVE_FILTERS,
        year: "2024",
        tags: ["日常", "治愈"],
      }).toString(),
    ).toBe("year=2024&tag=%E6%97%A5%E5%B8%B8%2C%E6%B2%BB%E6%84%88");

    expect(
      serializeArchiveFilters({
        ...DEFAULT_ARCHIVE_FILTERS,
        group: "rating",
        direction: "asc",
      }).toString(),
    ).toBe("group=rating&dir=asc");
  });
});

describe("archive filtering and grouping", () => {
  it.each([
    ["孤独", ["anime-1"]],
    ["ぼっち", ["anime-1"]],
    ["音乐", ["anime-1"]],
    ["乐队", ["anime-1"]],
  ])("searches title, original title, tags, and comment for %s", (query, ids) => {
    expect(
      filterAnime(records, {
        ...DEFAULT_ARCHIVE_FILTERS,
        q: query,
      }).map((anime) => anime.id),
    ).toEqual(ids);
  });

  it("requires every selected tag and every other active condition", () => {
    expect(
      filterAnime(records, {
        q: "",
        year: "2024",
        season: "夏",
        tags: ["日常", "治愈"],
        rating: 8,
        group: "season",
        direction: "desc",
      }).map((anime) => anime.id),
    ).toEqual(["anime-2"]);
  });

  it("orders the season dimension by broadcast season without mutating input", () => {
    const original = structuredClone(records);

    expect(
      filterAnime(records, {
        ...DEFAULT_ARCHIVE_FILTERS,
        group: "season",
        direction: "desc",
      }).map((anime) => anime.id),
    ).toEqual(["anime-3", "anime-4", "anime-1", "anime-2"]);
    expect(records).toEqual(original);
  });

  it("orders by rating according to the direction", () => {
    expect(
      filterAnime(records, {
        ...DEFAULT_ARCHIVE_FILTERS,
        group: "rating",
        direction: "asc",
      }).map((anime) => anime.id),
    ).toEqual(["anime-2", "anime-1", "anime-3", "anime-4"]);
  });

  it("groups one row per broadcast season with month labels", () => {
    const groups = groupArchive(records, {
      group: "season",
      direction: "desc",
    });

    expect(groups.map((group) => group.label)).toEqual([
      "2025年1月",
      "2024年10月",
      "2024年4月",
    ]);
    expect(groups[2].records.map((anime) => anime.id)).toEqual([
      "anime-1",
      "anime-2",
    ]);
  });

  it("groups by rating buckets without season dividers and supports ascending order", () => {
    const desc = groupArchive(records, {
      group: "rating",
      direction: "desc",
    });

    expect(desc.map((group) => group.label)).toEqual([
      "★ 10.0",
      "★ 9.5",
      "★ 9.0",
      "★ 8.5",
    ]);
    expect(desc[2].records.map((anime) => anime.id)).toEqual(["anime-1"]);

    const asc = groupArchive(records, {
      group: "rating",
      direction: "asc",
    });
    expect(asc.map((group) => group.label)).toEqual([
      "★ 8.5",
      "★ 9.0",
      "★ 9.5",
      "★ 10.0",
    ]);
  });

  it("returns unique browse options and archive statistics", () => {
    expect(getArchiveOptions(records)).toEqual({
      years: ["2025", "2024"],
      tags: ["科幻", "奇幻", "日常", "音乐", "治愈"],
    });
    expect(getArchiveStats(records)).toEqual({
      total: 4,
      seasonCount: 3,
      earliestYear: "2024",
      latestYear: "2025",
    });
  });

  it("returns safe empty options and statistics", () => {
    expect(getArchiveOptions([])).toEqual({ years: [], tags: [] });
    expect(getArchiveStats([])).toEqual({
      total: 0,
      seasonCount: 0,
      earliestYear: null,
      latestYear: null,
    });
  });
});

describe("getYearlyRecap", () => {
  const recapRecords: Anime[] = [
    {
      id: "a",
      title: "甲",
      season: "2024夏",
      cover: "",
      rating: 9,
      comment: "",
      episodes: 12,
      tags: ["日常", "治愈"],
      createdAt: "2024-07-01T00:00:00.000Z",
    },
    {
      id: "b",
      title: "乙",
      season: "2024冬",
      cover: "",
      rating: 8,
      comment: "",
      episodes: 12,
      tags: ["日常"],
      createdAt: "2024-01-01T00:00:00.000Z",
    },
    {
      id: "c",
      title: "丙",
      season: "2023秋",
      cover: "",
      rating: 9,
      comment: "",
      episodes: 24,
      tags: ["奇幻"],
      createdAt: "2023-10-01T00:00:00.000Z",
    },
    {
      id: "d",
      title: "缺季度",
      season: "其他",
      cover: "",
      rating: 10,
      comment: "",
      episodes: 1,
      tags: [],
      createdAt: "2024-02-01T00:00:00.000Z",
    },
  ];

  it("aggregates per year and excludes records without a season year", () => {
    expect(getYearlyRecap(recapRecords)).toEqual([
      {
        year: "2024",
        total: 2,
        averageRating: 8.5,
        topAnime: { title: "甲", rating: 9 },
        topTags: ["日常", "治愈"],
        episodesTotal: 24,
        topRatedCount: 1,
        seasonCounts: [
          { season: "夏", count: 1 },
          { season: "冬", count: 1 },
        ],
      },
      {
        year: "2023",
        total: 1,
        averageRating: 9,
        topAnime: { title: "丙", rating: 9 },
        topTags: ["奇幻"],
        episodesTotal: 24,
        topRatedCount: 1,
        seasonCounts: [{ season: "秋", count: 1 }],
      },
    ]);
  });

  it("breaks rating ties by title order and caps tags at three", () => {
    const tied: Anime[] = [
      {
        id: "t2",
        title: "乙",
        season: "2025春",
        cover: "",
        rating: 9,
        comment: "",
        episodes: 1,
        tags: ["A", "B", "C", "D"],
        createdAt: "2025-04-01T00:00:00.000Z",
      },
      {
        id: "t1",
        title: "甲",
        season: "2025夏",
        cover: "",
        rating: 9,
        comment: "",
        episodes: 1,
        tags: ["A"],
        createdAt: "2025-07-01T00:00:00.000Z",
      },
    ];

    const recap = getYearlyRecap(tied);
    // 平分时取标题顺序靠前的作品。
    expect(recap[0].topAnime).toEqual({ title: "甲", rating: 9 });
    expect(recap[0].topTags).toEqual(["A", "B", "C"]);
    expect(recap[0].episodesTotal).toBe(2);
    expect(recap[0].topRatedCount).toBe(2);
    expect(recap[0].seasonCounts).toEqual([
      { season: "春", count: 1 },
      { season: "夏", count: 1 },
    ]);
  });

  it("returns an empty recap for empty data", () => {
    expect(getYearlyRecap([])).toEqual([]);
  });
});
