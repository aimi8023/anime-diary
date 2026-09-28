import { describe, expect, it } from "vitest";
import {
  collectSeriesNames,
  normalizeSeriesTitle,
  SERIES_MATCH_THRESHOLD,
  suggestSeries,
} from "./series-match";

const known = [
  { name: "进击的巨人", memberCount: 12 },
  { name: "鬼灭之刃", memberCount: 6 },
  { name: "哥布林杀手", memberCount: 3 },
  { name: "野良神", memberCount: 4 },
  { name: "中二病也要谈恋爱！", memberCount: 5 },
  { name: "星之梦", memberCount: 3 },
];

describe("normalizeSeriesTitle", () => {
  it("strips punctuation, season tokens and format markers", () => {
    // 裸露的「篇」不当作季度标记（“进击篇”本身有意义），靠包含关系归集即可。
    expect(normalizeSeriesTitle("鬼灭之刃 刀匠村篇")).toBe("鬼灭之刃刀匠村篇");
    expect(normalizeSeriesTitle("剧场版 刀剑神域 进击篇")).toBe("刀剑神域进击篇");
    expect(normalizeSeriesTitle("Re：从零开始的异世界生活 第二季")).toBe(
      "re从零开始的异世界生活",
    );
    expect(normalizeSeriesTitle("进击的巨人 OAD")).toBe("进击的巨人");
    expect(normalizeSeriesTitle("Re：从零开始的异世界生活 第二季 后半部分")).toBe(
      "re从零开始的异世界生活",
    );
  });
});

describe("suggestSeries", () => {
  it("matches a plain new season by containment", () => {
    expect(suggestSeries("鬼灭之刃 游郭篇", known)[0]?.series).toBe("鬼灭之刃");
    expect(suggestSeries("鬼灭之刃 刀匠村篇", known)[0]?.series).toBe("鬼灭之刃");
    expect(suggestSeries("进击的巨人 最终季", known)[0]?.series).toBe(
      "进击的巨人",
    );
  });

  it("matches when the format marker comes first", () => {
    expect(
      suggestSeries("剧场版 哥布林杀手 哥布林的王冠", known)[0]?.series,
    ).toBe("哥布林杀手");
    expect(
      suggestSeries("电影 中二病也要谈恋爱！ -Take On Me-", known)[0]?.series,
    ).toBe("中二病也要谈恋爱！");
  });

  it("matches a subtitle tail without being told the season", () => {
    expect(suggestSeries("星之梦～雪圏球～", known)[0]?.series).toBe("星之梦");
    expect(suggestSeries("野良神 ARAGOTO OAD", known)[0]?.series).toBe("野良神");
  });

  it("returns an exact hit for the series name itself", () => {
    expect(suggestSeries("进击的巨人", known)[0]).toMatchObject({
      series: "进击的巨人",
      score: 1,
    });
  });

  it("does not suggest anything for an unrelated title", () => {
    expect(suggestSeries("葬送的芙莉莲", known)).toEqual([]);
    expect(suggestSeries("孤独摇滚！", known)).toEqual([]);
    expect(suggestSeries("", known)).toEqual([]);
  });

  it("does not suggest on a too-short title", () => {
    expect(suggestSeries("16", known)).toEqual([]);
  });

  it("keeps only the two strongest candidates", () => {
    const many = [
      { name: "进击的巨人", memberCount: 12 },
      { name: "进击的", memberCount: 1 },
      { name: "进", memberCount: 1 },
    ];
    expect(suggestSeries("进击的巨人 完结篇", many).length).toBeLessThanOrEqual(2);
  });

  it("scores every suggestion at or above the threshold", () => {
    for (const match of suggestSeries("鬼灭之刃 那田蜘蛛山篇", known)) {
      expect(match.score).toBeGreaterThanOrEqual(SERIES_MATCH_THRESHOLD);
    }
  });
});

describe("collectSeriesNames", () => {
  it("counts members and sorts by the largest series first", () => {
    const result = collectSeriesNames([
      { series: "甲作品" },
      { series: "甲作品" },
      { series: "乙作品" },
      { series: "  " },
      {},
    ]);
    expect(result).toEqual([
      { name: "甲作品", memberCount: 2 },
      { name: "乙作品", memberCount: 1 },
    ]);
  });
});
