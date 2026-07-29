import { describe, expect, it, vi } from "vitest";
import type { Redis } from "@upstash/redis";
import type { Anime } from "@/lib/types";
import type { BackupMetadata, BackupSnapshot } from "@/lib/backups/types";
import { createKvStorage } from "./storage-kv";

const first: Anime = {
  id: "anime-1",
  title: "孤独摇滚！",
  season: "2022冬",
  cover: "",
  rating: 9.5,
  comment: "",
  episodes: 12,
  tags: ["音乐"],
  bangumiId: 352821,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const second: Anime = {
  ...first,
  id: "anime-2",
  title: "轻音少女",
  bangumiId: 1424,
};

function redisDouble() {
  return {
    get: vi.fn(),
    eval: vi.fn(),
    zrange: vi.fn(),
    hget: vi.fn(),
  } as unknown as Redis;
}

describe("createKvStorage", () => {
  it("loads the legacy anime array as revision zero", async () => {
    const redis = redisDouble();
    vi.mocked(redis.get)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([first]);

    await expect(createKvStorage(redis).getState()).resolves.toEqual({
      revision: 0,
      data: [first],
    });
  });

  it("rejects malformed versioned state instead of returning an empty dataset", async () => {
    const redis = redisDouble();
    vi.mocked(redis.get).mockResolvedValueOnce({ revision: 1, data: null });

    await expect(createKvStorage(redis).getAll()).rejects.toThrow(
      "Redis 当前数据损坏",
    );
  });

  it("commits snapshot and next state through one conditional script", async () => {
    const redis = redisDouble();
    vi.mocked(redis.get)
      .mockResolvedValueOnce({ revision: 0, data: [first] })
      .mockResolvedValueOnce({ revision: 0, data: [first] });
    vi.mocked(redis.eval)
      .mockResolvedValueOnce({ committed: true, revision: 1 })
      .mockResolvedValueOnce(0);

    await createKvStorage(redis).add(second);

    expect(redis.eval).toHaveBeenCalledTimes(2);
    const commitCall = vi.mocked(redis.eval).mock.calls[0];
    expect(commitCall[1]).toEqual([
      "anime:state",
      "anime:all",
      "anime:backups",
      "anime:backup:metadata",
      expect.stringMatching(/^anime:backup:/),
    ]);
    expect(commitCall[2]).toEqual([
      "0",
      JSON.stringify({ revision: 1, data: [first, second] }),
      expect.stringContaining('"reason":"add"'),
      expect.any(String),
      expect.stringContaining(`"data":[${JSON.stringify(first)}]`),
    ]);
  });

  it("passes an empty previous dataset to Redis as a JSON array", async () => {
    const redis = redisDouble();
    vi.mocked(redis.get).mockResolvedValueOnce({
      revision: 0,
      data: [],
    });
    vi.mocked(redis.eval)
      .mockResolvedValueOnce({ committed: true, revision: 1 })
      .mockResolvedValueOnce(0);

    await createKvStorage(redis).add(first);

    const commitCall = vi.mocked(redis.eval).mock.calls[0];
    expect(JSON.parse(String(commitCall[2][4]))).toMatchObject({
      reason: "add",
      recordCount: 0,
      data: [],
    });
  });

  it("re-reads current state when the script reports a revision conflict", async () => {
    const redis = redisDouble();
    vi.mocked(redis.get)
      .mockResolvedValueOnce({ revision: 0, data: [first] })
      .mockResolvedValueOnce({ revision: 1, data: [first] });
    vi.mocked(redis.eval)
      .mockResolvedValueOnce({ committed: false })
      .mockResolvedValueOnce({ committed: true, revision: 2 })
      .mockResolvedValueOnce(0);

    await createKvStorage(redis).add(second);

    expect(redis.get).toHaveBeenCalledTimes(2);
    expect(redis.eval).toHaveBeenCalledTimes(3);
  });

  it("lists metadata in index order without loading snapshot bodies", async () => {
    const redis = redisDouble();
    const newest: BackupMetadata = {
      id: "backup-2",
      createdAt: "2026-07-29T00:00:02.000Z",
      reason: "update",
      recordCount: 2,
      schemaVersion: 1,
    };
    const oldest: BackupMetadata = {
      ...newest,
      id: "backup-1",
      createdAt: "2026-07-29T00:00:01.000Z",
      reason: "add",
      recordCount: 1,
    };
    vi.mocked(redis.zrange).mockResolvedValueOnce([
      newest.id,
      oldest.id,
    ]);
    vi.mocked(redis.hget)
      .mockResolvedValueOnce(newest)
      .mockResolvedValueOnce(oldest);

    await expect(createKvStorage(redis).listBackups()).resolves.toEqual([
      newest,
      oldest,
    ]);
    expect(redis.get).not.toHaveBeenCalled();
  });

  it("loads a requested snapshot body by safe id", async () => {
    const redis = redisDouble();
    const snapshot: BackupSnapshot = {
      id: "backup-1",
      createdAt: "2026-07-29T00:00:01.000Z",
      reason: "add",
      recordCount: 1,
      schemaVersion: 1,
      data: [first],
    };
    vi.mocked(redis.get).mockResolvedValueOnce(snapshot);

    await expect(createKvStorage(redis).getBackup(snapshot.id)).resolves.toEqual(
      snapshot,
    );
    expect(redis.get).toHaveBeenCalledWith("anime:backup:backup-1");
  });

  it("rejects unsafe snapshot ids before calling Redis", async () => {
    const redis = redisDouble();

    await expect(createKvStorage(redis).getBackup("../state")).resolves.toBeNull();
    expect(redis.get).not.toHaveBeenCalled();
  });
});
