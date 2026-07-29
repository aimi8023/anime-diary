import { describe, expect, it } from "vitest";
import type { Anime } from "@/lib/types";
import type { Storage } from "@/lib/storage";
import type {
  AnimeState,
  BackupMetadata,
  BackupSnapshot,
} from "./types";
import {
  BackupImportError,
  EmptyImportConfirmationError,
  createBackupService,
} from "./service";

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

class ServiceStorage implements Storage {
  state: AnimeState = { revision: 3, data: [first] };
  backups: BackupSnapshot[] = [
    {
      id: "backup-1",
      createdAt: "2026-07-29T00:00:00.000Z",
      reason: "add",
      recordCount: 2,
      schemaVersion: 1,
      data: [first, second],
    },
  ];

  async getAll() {
    return structuredClone(this.state.data);
  }

  async getState() {
    return structuredClone(this.state);
  }

  async findByBangumiId(id: number) {
    return this.state.data.find((anime) => anime.bangumiId === id) ?? null;
  }

  async add() {
    throw new Error("not used");
  }

  async update() {
    throw new Error("not used");
  }

  async remove() {
    throw new Error("not used");
  }

  async listBackups(): Promise<BackupMetadata[]> {
    return this.backups.map(({ data: _data, ...metadata }) => metadata);
  }

  async getBackup(id: string) {
    return structuredClone(
      this.backups.find((backup) => backup.id === id) ?? null,
    );
  }

  async replaceAll(data: Anime[], _reason: "import") {
    this.backups.unshift({
      id: "before-import",
      createdAt: "2026-07-29T01:00:00.000Z",
      reason: "import",
      recordCount: this.state.data.length,
      schemaVersion: 1,
      data: structuredClone(this.state.data),
    });
    this.state = {
      revision: this.state.revision + 1,
      data: structuredClone(data),
    };
    return structuredClone(this.state);
  }

  async restore(id: string) {
    const backup = this.backups.find((item) => item.id === id);
    if (!backup) throw new Error("missing");
    this.backups.unshift({
      id: "before-restore",
      createdAt: "2026-07-29T02:00:00.000Z",
      reason: "restore",
      recordCount: this.state.data.length,
      schemaVersion: 1,
      data: structuredClone(this.state.data),
    });
    this.state = {
      revision: this.state.revision + 1,
      data: structuredClone(backup.data),
    };
    return structuredClone(this.state);
  }
}

describe("backup service", () => {
  it("previews an import without mutating current storage", async () => {
    const storage = new ServiceStorage();
    const service = createBackupService(storage);

    const preview = await service.previewImport(JSON.stringify([second]));

    expect(preview).toMatchObject({
      format: "legacy",
      recordCount: 1,
      isEmpty: false,
      diff: {
        added: 1,
        removed: 1,
        changed: 0,
      },
    });
    expect(storage.state).toEqual({ revision: 3, data: [first] });
    expect(storage.backups).toHaveLength(1);
  });

  it("rejects invalid imports without changing storage", async () => {
    const storage = new ServiceStorage();
    const service = createBackupService(storage);

    await expect(service.previewImport("{broken")).rejects.toBeInstanceOf(
      BackupImportError,
    );
    expect(storage.state.data).toEqual([first]);
  });

  it("requires explicit confirmation before applying an empty import", async () => {
    const storage = new ServiceStorage();
    const service = createBackupService(storage);

    await expect(
      service.applyImport("[]", { confirmEmpty: false }),
    ).rejects.toBeInstanceOf(EmptyImportConfirmationError);
    expect(storage.state.data).toEqual([first]);
  });

  it("revalidates and applies a confirmed import with a pre-import snapshot", async () => {
    const storage = new ServiceStorage();
    const service = createBackupService(storage);

    const result = await service.applyImport(JSON.stringify([second]), {
      confirmEmpty: false,
    });

    expect(result).toEqual({ revision: 4, recordCount: 1 });
    expect(storage.state.data).toEqual([second]);
    expect(storage.backups[0]).toMatchObject({
      id: "before-import",
      reason: "import",
      data: [first],
    });
  });

  it("shows snapshot differences before restore", async () => {
    const service = createBackupService(new ServiceStorage());

    await expect(service.previewSnapshot("backup-1")).resolves.toMatchObject({
      metadata: { id: "backup-1", reason: "add", recordCount: 2 },
      diff: {
        added: 1,
        removed: 0,
        changed: 0,
        unchanged: 1,
      },
    });
  });

  it("restores through storage and reports the new state", async () => {
    const storage = new ServiceStorage();
    const service = createBackupService(storage);

    const result = await service.restore("backup-1");

    expect(result).toMatchObject({
      restoredSnapshot: { id: "backup-1" },
      revision: 4,
      recordCount: 2,
    });
    expect(storage.backups[0]).toMatchObject({
      id: "before-restore",
      data: [first],
    });
  });

  it("exports a fresh server-side current state", async () => {
    const storage = new ServiceStorage();
    const service = createBackupService(storage, {
      now: () => "2026-07-29T03:00:00.000Z",
    });
    storage.state = { revision: 4, data: [second] };

    await expect(service.exportCurrent()).resolves.toEqual({
      format: "anime-diary-backup",
      schemaVersion: 1,
      exportedAt: "2026-07-29T03:00:00.000Z",
      source: "current",
      data: [second],
    });
  });

  it("exports a requested snapshot with its metadata", async () => {
    const service = createBackupService(new ServiceStorage(), {
      now: () => "2026-07-29T03:00:00.000Z",
    });

    await expect(service.exportSnapshot("backup-1")).resolves.toMatchObject({
      source: "snapshot",
      snapshot: {
        id: "backup-1",
        reason: "add",
      },
      data: [first, second],
    });
  });
});
