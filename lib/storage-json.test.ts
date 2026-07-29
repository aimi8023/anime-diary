import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Anime } from "@/lib/types";
import { createJsonStorage } from "./storage-json";

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
  createdAt: "2026-01-02T00:00:00.000Z",
};

describe("createJsonStorage", { timeout: 15_000 }, () => {
  let root: string;
  let dataFile: string;
  let revisionFile: string;
  let backupDir: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "anime-diary-json-"));
    dataFile = path.join(root, "anime.json");
    revisionFile = path.join(root, "anime.revision.json");
    backupDir = path.join(root, "backups");
    await fs.writeFile(dataFile, JSON.stringify([first]), "utf8");
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  function storage() {
    return createJsonStorage({ dataFile, revisionFile, backupDir });
  }

  it("loads a legacy array as revision zero", async () => {
    await expect(storage().getState()).resolves.toEqual({
      revision: 0,
      data: [first],
    });
  });

  it("snapshots the previous dataset before replacing it", async () => {
    const store = storage();

    await store.add(second);

    expect(await store.getState()).toEqual({
      revision: 1,
      data: [first, second],
    });
    const backups = await store.listBackups();
    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatchObject({
      reason: "add",
      recordCount: 1,
    });
    expect((await store.getBackup(backups[0].id))?.data).toEqual([first]);
  });

  it("makes restore reversible by snapshotting the pre-restore dataset", async () => {
    const store = storage();
    await store.add(second);
    const original = (await store.listBackups())[0];

    await store.restore(original.id);

    expect((await store.getState()).data).toEqual([first]);
    const backups = await store.listBackups();
    expect(backups).toHaveLength(2);
    const beforeRestore = await store.getBackup(backups[0].id);
    expect(beforeRestore).toMatchObject({
      reason: "restore",
      data: [first, second],
    });
  });

  it("serializes parallel mutations so neither write is lost", async () => {
    const store = storage();
    const third = {
      ...first,
      id: "anime-3",
      title: "摇曳露营",
      bangumiId: 207195,
    };

    await Promise.all([store.add(second), store.add(third)]);

    expect(
      (await store.getState()).data.map((anime) => anime.id).sort(),
    ).toEqual(["anime-1", "anime-2", "anime-3"]);
    expect(await store.listBackups()).toHaveLength(2);
  });

  it(
    "keeps only the newest 30 snapshots",
    async () => {
      const store = storage();

      for (let index = 0; index < 31; index += 1) {
        await store.update(first.id, { comment: `第 ${index} 次修改` });
      }

      const backups = await store.listBackups();
      expect(backups).toHaveLength(30);
      expect(backups[0].createdAt >= backups[29].createdAt).toBe(true);
    },
    15_000,
  );

  it("throws on malformed current data instead of returning an empty list", async () => {
    await fs.writeFile(dataFile, "{broken", "utf8");

    await expect(storage().getAll()).rejects.toThrow("当前数据文件损坏");
  });

  it("throws on a non-array current data file", async () => {
    await fs.writeFile(dataFile, JSON.stringify({ data: [] }), "utf8");

    await expect(storage().getAll()).rejects.toThrow("当前数据文件损坏");
  });

  it("rejects unsafe snapshot ids without reading outside the backup directory", async () => {
    await expect(storage().getBackup("../anime")).resolves.toBeNull();
  });

  it("backs up the current dataset before a full import replacement", async () => {
    const store = storage();

    await store.replaceAll([second], "import");

    expect((await store.getState()).data).toEqual([second]);
    const backup = (await store.listBackups())[0];
    expect(backup.reason).toBe("import");
    expect((await store.getBackup(backup.id))?.data).toEqual([first]);
  });
});
