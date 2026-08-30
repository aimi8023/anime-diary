import { describe, expect, it } from "vitest";
import {
  mapSearchSubject,
  mapSubjectToPrefill,
  seasonFromAirDate,
} from "./mapper";
import type { BangumiSubject } from "./types";

const fullSubject: BangumiSubject = {
  id: 352821,
  name: "ぼっち・ざ・ろっく！",
  name_cn: "孤独摇滚！",
  date: "2022-10-09",
  eps: 12,
  images: {
    large: "https://lain.bgm.tv/large.jpg",
    common: "https://lain.bgm.tv/common.jpg",
    medium: "https://lain.bgm.tv/medium.jpg",
  },
  tags: [
    { name: "芳文社", count: 100 },
    { name: "音乐", count: 99 },
    { name: "青春", count: 98 },
    { name: "乐队", count: 97 },
    { name: "日常", count: 96 },
    { name: "喜剧", count: 95 },
    { name: "成长", count: 94 },
    { name: "校园", count: 93 },
    { name: "漫画改", count: 92 },
    { name: "治愈", count: 91 },
    { name: "轻百合", count: 90 },
    { name: "2022", count: 89 },
    { name: "超出上限", count: 88 },
  ],
};

describe("seasonFromAirDate", () => {
  it.each([
    ["2025-12-15", "2026春"],
    ["2026-02-28", "2026春"],
    ["2026-03-01", "2026夏"],
    ["2026-03-31", "2026夏"],
    ["2026-05-31", "2026夏"],
    ["2026-06-01", "2026秋"],
    ["2026-08-31", "2026秋"],
    ["2026-09-01", "2026冬"],
    ["2026-10-01", "2026冬"],
    ["2026-11-30", "2026冬"],
  ])("maps %s to %s", (date, expected) => {
    expect(seasonFromAirDate(date)).toBe(expected);
  });

  it.each(["invalid", "2026-00-01", "2026-13-01", undefined])(
    "returns an empty season for %s",
    (date) => {
      expect(seasonFromAirDate(date)).toBe("");
    },
  );
});

describe("mapSubjectToPrefill", () => {
  it("maps the selected subject into editable local snapshot fields", () => {
    expect(mapSubjectToPrefill(fullSubject)).toEqual({
      bangumiId: 352821,
      bangumiUrl: "https://bgm.tv/subject/352821",
      title: "孤独摇滚！",
      originalTitle: "ぼっち・ざ・ろっく！",
      cover: "https://lain.bgm.tv/large.jpg",
      airDate: "2022-10-09",
      season: "2022冬",
      episodes: 12,
      suggestedTags: [
        "芳文社",
        "音乐",
        "青春",
        "乐队",
        "日常",
        "喜剧",
        "成长",
        "校园",
        "漫画改",
        "治愈",
        "轻百合",
        "2022",
      ],
    });
  });

  it("falls back across names, covers, episodes, and tags", () => {
    const mapped = mapSubjectToPrefill({
      ...fullSubject,
      name_cn: " ",
      date: "not-a-date",
      eps: -2,
      images: {
        common: "",
        medium: "https://lain.bgm.tv/medium-only.jpg",
      },
      tags: [
        { name: " 音乐 " },
        { name: "" },
        { name: "音乐" },
        { name: undefined },
      ],
    });

    expect(mapped.title).toBe("ぼっち・ざ・ろっく！");
    expect(mapped.cover).toBe("https://lain.bgm.tv/medium-only.jpg");
    expect(mapped.airDate).toBe("");
    expect(mapped.season).toBe("");
    expect(mapped.episodes).toBe(0);
    expect(mapped.suggestedTags).toEqual(["音乐"]);
  });

  it("uses an empty cover when no supported image exists", () => {
    expect(mapSearchSubject({ ...fullSubject, images: null }).cover).toBe("");
  });
});
