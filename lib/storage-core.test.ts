import { describe, expect, it, vi } from "vitest";
import type { Anime } from "@/lib/types";
import type {
  AnimeState,
  BackupMetadata,
  BackupSnapshot,
} from "@/lib/backups/types";
import type {
  CommitInput,
  CommitResult,
  VersionedStorageAdapter,
} from "./storage";
import {
  BackupNotFoundError,
  DuplicateBangumiError,
  RevisionConflictError,
  createVersionedStorage,
} from "./storage-core";

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

class MemoryAdapter implements VersionedStorageAdapter {
  state: AnimeState;
  backups: BackupSnapshot[] = [];
  commits: CommitInput[] = [];
  readCount = 0;
  conflictsRemaining = 0;
  prune = vi.fn(async (_keep: number) => undefined);

  constructor(data: Anime[] = [first]) {
    this.state = { revision: 0, data: structuredClone(data) };
  }

  async readState(): Promise<AnimeState> {
    this.readCount += 1;
    return structuredClone(this.state);
  }

  async commit(input: CommitInput): Promise<CommitResult> {
    this.commits.push(structuredClone(input));
    if (
      this.conflictsRemaining > 0 ||
      input.expectedRevision !== this.state.revision
    ) {
      this.conflictsRemaining = Math.max(0, this.conflictsRemaining - 1);
      return { committed: false };
    }

    this.backups.push({
      ...input.snapshot,
      data: structuredClone(this.state.data),
    });
    this.state = {
      revision: this.state.revision + 1,
      data: structuredClone(input.nextData),
    };
    return { committed: true, state: structuredClone(this.state) };
  }

  async listBackups(): Promise<BackupMetadata[]> {
    return this.backups.map(({ data: _data, ...metadata }) => metadata);
  }

  async getBackup(id: string): Promise<BackupSnapshot | null> {
    return structuredClone(
      this.backups.find((backup) => backup.id === id) ?? null,
    );
  }
}

function createStorage(adapter: MemoryAdapter) {
  let id = 0;
  return createVersionedStorage(adapter, {
    createId: () => `backup-${++id}`,
    now: () => `2026-07-29T00:00:0${id}.000Z`,
    logger: { error: vi.fn() },
  });
}

describe("createVersionedStorage", () => {
  it("commits an add with a snapshot of the previous state", async () => {
    const adapter = new MemoryAdapter();
    const storage = createStorage(adapter);

    await storage.add(second);

    expect(adapter.commits[0]).toMatchObject({
      expectedRevision: 0,
      reason: "add",
      nextData: [first, second],
      snapshot: {
        id: "backup-1",
        reason: "add",
        recordCount: 1,
        schemaVersion: 1,
      },
    });
    expect(adapter.backups[0].data).toEqual([first]);
    expect(adapter.prune).toHaveBeenCalledWith(30);
  });

  it("re-reads and reapplies a mutation after a revision conflict", async () => {
    const adapter = new MemoryAdapter([first, second]);
    adapter.conflictsRemaining = 1;
    const storage = createStorage(adapter);

    await storage.remove(first.id);

    expect(adapter.readCount).toBe(2);
    expect(adapter.commits).toHaveLength(2);
    expect(adapter.state.data).toEqual([second]);
  });

  it("does not overwrite data after three revision conflicts", async () => {
    const adapter = new MemoryAdapter([first, second]);
    adapter.conflictsRemaining = 3;
    const storage = createStorage(adapter);

    await expect(storage.remove(first.id)).rejects.toBeInstanceOf(
      RevisionConflictError,
    );
    expect(adapter.state.data).toEqual([first, second]);
    expect(adapter.commits).toHaveLength(3);
  });

  it("checks duplicate Bangumi ids inside every retried add", async () => {
    const adapter = new MemoryAdapter([first]);
    const originalCommit = adapter.commit.bind(adapter);
    adapter.commit = async (input) => {
      if (adapter.commits.length === 0) {
        adapter.state = {
          revision: 1,
          data: [{ ...second, id: "competing-record" }],
        };
      }
      return originalCommit(input);
    };
    const storage = createStorage(adapter);

    await expect(
      storage.add({ ...second, id: "requested-record" }),
    ).rejects.toMatchObject({
      name: "DuplicateBangumiError",
      existingId: "competing-record",
    });
    expect(adapter.state.data).toHaveLength(1);
  });

  it("rejects an update that takes another record's Bangumi id", async () => {
    const adapter = new MemoryAdapter([first, second]);
    const storage = createStorage(adapter);

    await expect(
      storage.update(first.id, { bangumiId: second.bangumiId }),
    ).rejects.toBeInstanceOf(DuplicateBangumiError);
    expect(adapter.commits).toHaveLength(0);
  });

  it("restores a snapshot while preserving the pre-restore state", async () => {
    const adapter = new MemoryAdapter([first]);
    const storage = createStorage(adapter);
    await storage.add(second);
    const originalBackupId = adapter.backups[0].id;

    await storage.restore(originalBackupId);

    expect(adapter.state.data).toEqual([first]);
    expect(adapter.backups).toHaveLength(2);
    expect(adapter.backups[1]).toMatchObject({
      reason: "restore",
      data: [first, second],
    });
  });

  it("reports a missing restore target without creating a snapshot", async () => {
    const adapter = new MemoryAdapter();
    const storage = createStorage(adapter);

    await expect(storage.restore("missing")).rejects.toBeInstanceOf(
      BackupNotFoundError,
    );
    expect(adapter.commits).toHaveLength(0);
  });

  it("keeps a successful write when best-effort pruning fails", async () => {
    const adapter = new MemoryAdapter();
    adapter.prune.mockRejectedValueOnce(new Error("cleanup unavailable"));
    const logger = { error: vi.fn() };
    const storage = createVersionedStorage(adapter, {
      createId: () => "backup-1",
      now: () => "2026-07-29T00:00:00.000Z",
      logger,
    });

    await expect(storage.add(second)).resolves.toBeUndefined();
    expect(adapter.state.data).toEqual([first, second]);
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to prune backup history:",
      expect.any(Error),
    );
  });
});
