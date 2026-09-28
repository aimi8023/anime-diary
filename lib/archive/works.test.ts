import { describe, expect, it } from "vitest";
import type { Anime } from "@/lib/types";
import {
  groupIntoWorks,
  workDisplayMarks,
  workKey,
  workKeysMatchingMarks,
} from "./works";

const base = {
  cover: "",
  comment: "",
  episodes: 12,
  tags: [],
  createdAt: "2024-01-01T00:00:00.000Z",
};

const records: Anime[] = [
  {
    ...base,
    id: "a1",
    title: "无职转生",
    season: "2021春",
    rating: 10,
    series: "无职转生",
    marks: ["rewatch"],
  },
  {
    ...base,
    id: "a2",
    title: "无职转生 第二季",
    season: "2021秋",
    rating: 10,
    series: "无职转生",
  },
  {
    ...base,
    id: "a3",
    title: "无职转生 第三季",
    season: "2024夏",
    rating: 9,
    series: "无职转生",
    marks: ["sequel"],
  },
  {
    ...base,
    id: "b1",
    title: "葬送的芙莉莲",
    season: "2023冬",
    rating: 9.5,
    marks: ["source"],
  },
];

describe("workKey", () => {
  it("uses the series name when present and the record id otherwise", () => {
    expect(workKey(records[0])).toBe("无职转生");
    expect(workKey(records[3])).toBe("b1");
  });

  it("treats a blank series as a standalone work", () => {
    expect(workKey({ ...records[0], series: "   " })).toBe("a1");
  });
});

describe("groupIntoWorks", () => {
  it("merges entries sharing a series and keeps standalone records separate", () => {
    const works = groupIntoWorks(records);

    expect(works).toHaveLength(2);
    const mushoku = works.find((w) => w.key === "无职转生");
    expect(mushoku?.isGrouped).toBe(true);
    expect(mushoku?.records.map((r) => r.id)).toEqual(["a1", "a2", "a3"]);
    expect(mushoku?.name).toBe("无职转生");
    // 未归集的作品不算 grouped。
    expect(works.find((w) => w.key === "b1")?.isGrouped).toBe(false);
  });

  it("sorts entries by broadcast season from old to new", () => {
    const shuffled = [records[2], records[0], records[1], records[3]];
    const work = groupIntoWorks(shuffled).find((w) => w.key === "无职转生");
    expect(work?.records.map((r) => r.season)).toEqual([
      "2021春",
      "2021秋",
      "2024夏",
    ]);
  });

  it("unions marks across entries and takes the highest rating and latest season", () => {
    const work = groupIntoWorks(records).find((w) => w.key === "无职转生");
    expect(work?.marks).toEqual(["rewatch", "sequel"]);
    // 评分取最高分：10 / 10 / 9 → 10。
    expect(work?.maxRating).toBe(10);
    expect(work?.ratedCount).toBe(3);
    // 时间取最新档期。
    expect(work?.latestSeason).toBe("2024夏");
    expect(work?.latestSeasonLabel).toBe("2024年4月");
    expect(work?.seasonLabels).toEqual(["2021年1月", "2021年7月", "2024年4月"]);
  });

  it("reports no rating when nothing in the work is rated", () => {
    const unrated = records.map((r) => ({ ...r, rating: 0, marks: [] }));
    const work = groupIntoWorks(unrated).find((w) => w.key === "无职转生");
    expect(work?.maxRating).toBeNull();
    expect(work?.ratedCount).toBe(0);
  });

  it("sorts works by their latest season", () => {
    const works = groupIntoWorks(records);
    // 芙莉莲最新 2023冬，早于无职转生的 2024夏。
    expect(works.map((w) => w.latestSeason)).toEqual(["2023冬", "2024夏"]);
  });

  it("does not mutate the input array or its records", () => {
    const original = structuredClone(records);
    const copy = [...records];
    groupIntoWorks(copy);
    expect(copy).toEqual(records);
    expect(records).toEqual(original);
  });

  it("keeps legacy records without a series renderable", () => {
    const legacy: Anime = { ...base, id: "z1", title: "旧记录", season: "2020夏", rating: 8 };
    const work = groupIntoWorks([legacy])[0];
    expect(work.name).toBe("旧记录");
    expect(work.marks).toEqual([]);
    expect(work.isGrouped).toBe(false);
  });
});

describe("workKeysMatchingMarks", () => {
  it("matches the whole work when any entry carries the mark", () => {
    const keys = workKeysMatchingMarks(records, ["rewatch"]);
    expect([...keys]).toEqual(["无职转生"]);
  });

  it("requires every selected mark to be present on the work", () => {
    expect([...workKeysMatchingMarks(records, ["rewatch", "sequel"])]).toEqual([
      "无职转生",
    ]);
    expect([...workKeysMatchingMarks(records, ["rewatch", "source"])]).toEqual([]);
  });

  it("returns every work key when no mark is selected", () => {
    expect(workKeysMatchingMarks(records, []).size).toBe(2);
  });
});

describe("workDisplayMarks", () => {
  it("keeps marks already dropped from the built-in vocabulary", () => {
    const stale: Anime = { ...records[3], marks: ["source", "已下线的旧标记"] };
    expect(workDisplayMarks(groupIntoWorks([stale])[0])).toEqual([
      "source",
      "已下线的旧标记",
    ]);
  });
});
