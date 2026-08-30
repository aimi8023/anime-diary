import { describe, expect, it } from "vitest";
import {
  parseAnimeCreateInput,
  parseAnimeUpdateInput,
} from "./validation";

const validInput = {
  title: "孤独摇滚！",
  season: "2022冬",
  cover: "https://lain.bgm.tv/cover.jpg",
  rating: 9.5,
  comment: "很喜欢",
  episodes: 12,
  tags: ["音乐", "青春"],
  bangumiId: 352821,
  bangumiUrl: "https://bgm.tv/subject/352821",
  originalTitle: "ぼっち・ざ・ろっく！",
  airDate: "2022-10-09",
};

describe("parseAnimeCreateInput", () => {
  it("normalizes supported fields without mutating the input", () => {
    const input = {
      ...validInput,
      title: " 孤独摇滚！ ",
      season: " 2022冬 ",
      cover: " https://lain.bgm.tv/cover.jpg ",
      comment: " 很喜欢 ",
      tags: [" 音乐 ", "青春", "音乐"],
      bangumiUrl: " https://bgm.tv/subject/352821 ",
      originalTitle: " ぼっち・ざ・ろっく！ ",
      airDate: " 2022-10-09 ",
    };
    const original = structuredClone(input);

    expect(parseAnimeCreateInput(input)).toEqual({
      ok: true,
      data: validInput,
    });
    expect(input).toEqual(original);
  });

  it("defaults optional local fields for a minimal create", () => {
    expect(
      parseAnimeCreateInput({
        title: "葬送的芙莉莲",
        season: "2023秋",
      }),
    ).toEqual({
      ok: true,
      data: {
        title: "葬送的芙莉莲",
        season: "2023秋",
        cover: "",
        rating: 1,
        comment: "",
        episodes: 0,
        tags: [],
      },
    });
  });

  it.each(["2024春", "2024夏", "2024秋", "2024冬"])(
    "accepts the season format %s",
    (season) => {
      expect(
        parseAnimeCreateInput({ title: "测试", season }),
      ).toMatchObject({ ok: true, data: { season } });
    },
  );

  it("accepts rating 0 as the unrated sentinel in create and update", () => {
    expect(
      parseAnimeCreateInput({ ...validInput, rating: 0 }),
    ).toMatchObject({ ok: true, data: { rating: 0 } });
    expect(parseAnimeUpdateInput({ rating: 0 })).toMatchObject({
      ok: true,
      data: { rating: 0 },
    });
  });

  it.each([
    ["non-object body", null, "$"],
    ["empty title", { ...validInput, title: " " }, "title"],
    ["missing season", { ...validInput, season: undefined }, "season"],
    ["foreign URL scheme", { ...validInput, cover: "javascript:alert(1)" }, "cover"],
    ["non-finite rating", { ...validInput, rating: "NaN" }, "rating"],
    ["rating below range", { ...validInput, rating: -0.5 }, "rating"],
    ["rating off step", { ...validInput, rating: 9.2 }, "rating"],
    ["fractional episodes", { ...validInput, episodes: 12.5 }, "episodes"],
    ["negative episodes", { ...validInput, episodes: -1 }, "episodes"],
    ["non-array tags", { ...validInput, tags: "音乐" }, "tags"],
    [
      "too many tags",
      { ...validInput, tags: Array.from({ length: 21 }, (_, index) => `标签${index}`) },
      "tags",
    ],
    ["empty tag", { ...validInput, tags: [" "] }, "tags.0"],
    ["invalid Bangumi ID", { ...validInput, bangumiId: 0 }, "bangumiId"],
    ["invalid air date", { ...validInput, airDate: "2022-02-31" }, "airDate"],
    ["season without year", { ...validInput, season: "冬" }, "season"],
    ["season with prose text", { ...validInput, season: "2023年秋" }, "season"],
    ["season with short year", { ...validInput, season: "23秋" }, "season"],
  ])("rejects %s", (_label, input, path) => {
    const result = parseAnimeCreateInput(input);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected validation failure");
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path })]),
    );
  });

  it("collects independent field issues in one response", () => {
    const result = parseAnimeCreateInput({
      title: "",
      season: "",
      rating: 11,
      episodes: -2,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected validation failure");
    expect(result.issues.map((issue) => issue.path)).toEqual([
      "title",
      "season",
      "rating",
      "episodes",
    ]);
  });
});

describe("parseAnimeUpdateInput", () => {
  it("normalizes only fields present in a partial update", () => {
    expect(
      parseAnimeUpdateInput({
        title: " 新标题 ",
        tags: [" 日常 ", "日常", "治愈"],
      }),
    ).toEqual({
      ok: true,
      data: {
        title: "新标题",
        tags: ["日常", "治愈"],
      },
    });
  });

  it("normalizes empty optional metadata to undefined for clearing", () => {
    expect(
      parseAnimeUpdateInput({
        bangumiUrl: "",
        originalTitle: " ",
        airDate: "",
      }),
    ).toEqual({
      ok: true,
      data: {
        bangumiUrl: undefined,
        originalTitle: undefined,
        airDate: undefined,
      },
    });
  });

  it("rejects an update without a supported field", () => {
    expect(parseAnimeUpdateInput({ unknown: "value" })).toEqual({
      ok: false,
      issues: [
        {
          path: "$",
          message: "至少需要提供一个可更新字段",
        },
      ],
    });
  });

  it("uses create field rules for fields that are present", () => {
    const result = parseAnimeUpdateInput({
      title: " ",
      rating: Number.NaN,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected validation failure");
    expect(result.issues.map((issue) => issue.path)).toEqual([
      "title",
      "rating",
    ]);
  });
});
