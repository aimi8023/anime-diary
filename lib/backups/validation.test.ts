import { describe, expect, it } from "vitest";
import type { Anime } from "@/lib/types";
import {
  MAX_BACKUP_BYTES,
  parseBackupJson,
  validateBackupSize,
} from "./validation";

const anime: Anime = {
  id: "anime-1",
  title: "孤独摇滚！",
  season: "2022冬",
  cover: "https://example.com/cover.jpg",
  rating: 9.5,
  comment: "很喜欢",
  episodes: 12,
  tags: ["音乐", "乐队"],
  bangumiId: 352821,
  bangumiUrl: "https://bgm.tv/subject/352821",
  originalTitle: "ぼっち・ざ・ろっく！",
  airDate: "2022-10-09",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("parseBackupJson", () => {
  it("accepts the legacy array format without changing its records", () => {
    const result = parseBackupJson(JSON.stringify([anime]));

    expect(result).toEqual({
      ok: true,
      data: [anime],
      warnings: [],
      isEmpty: false,
      format: "legacy",
    });
  });

  it("accepts the versioned backup format", () => {
    const result = parseBackupJson(
      JSON.stringify({
        format: "anime-diary-backup",
        schemaVersion: 1,
        exportedAt: "2026-07-29T00:00:00.000Z",
        source: "current",
        data: [anime],
      }),
    );

    expect(result).toMatchObject({
      ok: true,
      data: [anime],
      format: "versioned",
    });
  });

  it("reports malformed JSON without exposing importable data", () => {
    const result = parseBackupJson("{broken");

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: "invalid_json",
          message: "文件不是有效的 JSON",
        },
      ],
    });
    expect("data" in result).toBe(false);
  });

  it("rejects an unsupported schema version", () => {
    const result = parseBackupJson(
      JSON.stringify({
        format: "anime-diary-backup",
        schemaVersion: 2,
        exportedAt: "2026-07-29T00:00:00.000Z",
        source: "current",
        data: [anime],
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      issues: [
        expect.objectContaining({
          code: "unsupported_schema",
        }),
      ],
    });
  });

  it("rejects duplicate record ids and Bangumi ids", () => {
    const result = parseBackupJson(
      JSON.stringify([
        anime,
        { ...anime, title: "另一条同 ID 记录" },
        { ...anime, id: "anime-2", title: "另一条同 Bangumi 记录" },
      ]),
    );

    expect(result).toMatchObject({ ok: false });
    if (result.ok) throw new Error("expected validation failure");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "duplicate_id",
          recordIndex: 1,
        }),
        expect.objectContaining({
          code: "duplicate_bangumi_id",
          recordIndex: 2,
        }),
      ]),
    );
  });

  it.each([
    [{ ...anime, rating: 10.5 }, "invalid_rating"],
    [{ ...anime, rating: 9.3 }, "invalid_rating"],
    [{ ...anime, episodes: -1 }, "invalid_episodes"],
    [{ ...anime, createdAt: "not-a-date" }, "invalid_created_at"],
    [{ ...anime, tags: ["音乐", 2] }, "invalid_tags"],
  ])("rejects invalid persisted record fields", (record, code) => {
    const result = parseBackupJson(JSON.stringify([record]));

    expect(result).toMatchObject({ ok: false });
    if (result.ok) throw new Error("expected validation failure");
    expect(result.issues).toContainEqual(expect.objectContaining({ code }));
  });

  it("accepts an empty dataset but marks it for extra confirmation", () => {
    expect(parseBackupJson("[]")).toEqual({
      ok: true,
      data: [],
      warnings: [],
      isEmpty: true,
      format: "legacy",
    });
  });
});

describe("validateBackupSize", () => {
  it("rejects files larger than 5 MB", () => {
    expect(validateBackupSize(MAX_BACKUP_BYTES + 1)).toEqual({
      ok: false,
      issue: {
        code: "file_too_large",
        message: "备份文件不能超过 5 MB",
      },
    });
  });

  it("accepts a file at the 5 MB boundary", () => {
    expect(validateBackupSize(MAX_BACKUP_BYTES)).toEqual({ ok: true });
  });
});
