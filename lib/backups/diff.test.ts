import { describe, expect, it } from "vitest";
import type { Anime } from "@/lib/types";
import { createBackupFile, diffAnimeData } from "./diff";

const base: Anime = {
  id: "anime-1",
  title: "孤独摇滚！",
  season: "2022冬",
  cover: "https://example.com/cover.jpg",
  rating: 9.5,
  comment: "很喜欢",
  episodes: 12,
  tags: ["音乐"],
  bangumiId: 352821,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("diffAnimeData", () => {
  it("counts added, removed, changed, and unchanged records by local id", () => {
    const current = [
      base,
      { ...base, id: "removed", title: "将被移除" },
      { ...base, id: "changed", title: "修改前" },
      { ...base, id: "same", title: "保持不变" },
    ];
    const target = [
      base,
      { ...base, id: "added", title: "新加入" },
      { ...base, id: "changed", title: "修改后" },
      { ...base, id: "same", title: "保持不变" },
    ];

    expect(diffAnimeData(current, target)).toEqual({
      added: 1,
      removed: 1,
      changed: 1,
      unchanged: 2,
      addedTitles: ["新加入"],
      removedTitles: ["将被移除"],
      changedTitles: ["修改后"],
    });
  });

  it("detects tag changes without mutating either dataset", () => {
    const current = [{ ...base, tags: ["音乐", "乐队"] }];
    const target = [{ ...base, tags: ["乐队", "音乐"] }];
    const currentBefore = structuredClone(current);
    const targetBefore = structuredClone(target);

    expect(diffAnimeData(current, target).changed).toBe(1);
    expect(current).toEqual(currentBefore);
    expect(target).toEqual(targetBefore);
  });

  it("limits representative title lists to five items", () => {
    const target = Array.from({ length: 7 }, (_, index) => ({
      ...base,
      id: `new-${index}`,
      title: `新增 ${index}`,
    }));

    expect(diffAnimeData([], target).addedTitles).toEqual([
      "新增 0",
      "新增 1",
      "新增 2",
      "新增 3",
      "新增 4",
    ]);
  });
});

describe("createBackupFile", () => {
  it("creates a versioned current-data export", () => {
    const file = createBackupFile([base], {
      source: "current",
      exportedAt: "2026-07-29T00:00:00.000Z",
    });

    expect(file).toEqual({
      format: "anime-diary-backup",
      schemaVersion: 1,
      exportedAt: "2026-07-29T00:00:00.000Z",
      source: "current",
      data: [base],
    });
    expect(JSON.stringify(file)).not.toContain("admin_token");
    expect(JSON.stringify(file)).not.toContain("redis");
  });
});
