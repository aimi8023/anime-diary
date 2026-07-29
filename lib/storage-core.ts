import { nanoid } from "nanoid";
import type {
  AnimeState,
  BackupReason,
} from "@/lib/backups/types";
import type { Anime, AnimeInput } from "@/lib/types";
import type {
  Storage,
  VersionedStorageAdapter,
} from "@/lib/storage";

const DEFAULT_BACKUP_LIMIT = 30;
const DEFAULT_MAX_ATTEMPTS = 3;

export class DuplicateBangumiError extends Error {
  readonly code = "duplicate_bangumi";
  existingId: string;

  constructor(existingId: string) {
    super("该 Bangumi 条目已收录");
    this.name = "DuplicateBangumiError";
    this.existingId = existingId;
  }
}

export class RevisionConflictError extends Error {
  readonly code = "revision_conflict";

  constructor() {
    super("数据已被其他操作更新，请刷新后重试");
    this.name = "RevisionConflictError";
  }
}

export class BackupNotFoundError extends Error {
  readonly code = "backup_not_found";

  constructor(id: string) {
    super(`备份 ${id} 不存在`);
    this.name = "BackupNotFoundError";
  }
}

export class AnimeNotFoundError extends Error {
  readonly code = "anime_not_found";

  constructor(id: string) {
    super(`Anime with id ${id} not found`);
    this.name = "AnimeNotFoundError";
  }
}

interface VersionedStorageOptions {
  createId?: () => string;
  now?: () => string;
  maxAttempts?: number;
  backupLimit?: number;
  logger?: Pick<Console, "error">;
}

function cloneData(data: Anime[]): Anime[] {
  return structuredClone(data);
}

function sortedForDisplay(data: Anime[]): Anime[] {
  return cloneData(data).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function duplicateBangumi(
  data: Anime[],
  bangumiId: number | undefined,
  excludeId?: string,
): Anime | undefined {
  if (bangumiId === undefined) return undefined;
  return data.find(
    (anime) => anime.bangumiId === bangumiId && anime.id !== excludeId,
  );
}

export function createVersionedStorage(
  adapter: VersionedStorageAdapter,
  options: VersionedStorageOptions = {},
): Storage {
  const createId = options.createId ?? (() => nanoid(16));
  const now = options.now ?? (() => new Date().toISOString());
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const backupLimit = options.backupLimit ?? DEFAULT_BACKUP_LIMIT;
  const logger = options.logger ?? console;

  async function pruneBestEffort(): Promise<void> {
    try {
      await adapter.prune(backupLimit);
    } catch (error) {
      logger.error("Failed to prune backup history:", error);
    }
  }

  async function mutate(
    reason: BackupReason,
    transform: (current: Anime[]) => Anime[],
  ): Promise<AnimeState> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const current = await adapter.readState();
      const nextData = transform(cloneData(current.data));
      const result = await adapter.commit({
        expectedRevision: current.revision,
        previousData: cloneData(current.data),
        nextData: cloneData(nextData),
        reason,
        snapshot: {
          id: createId(),
          createdAt: now(),
          reason,
          recordCount: current.data.length,
          schemaVersion: 1,
        },
      });

      if (result.committed) {
        await pruneBestEffort();
        return {
          revision: result.state.revision,
          data: cloneData(result.state.data),
        };
      }
    }

    throw new RevisionConflictError();
  }

  return {
    async getAll() {
      return sortedForDisplay((await adapter.readState()).data);
    },

    async getState() {
      const state = await adapter.readState();
      return { revision: state.revision, data: cloneData(state.data) };
    },

    async findByBangumiId(bangumiId: number) {
      const state = await adapter.readState();
      return (
        state.data.find((anime) => anime.bangumiId === bangumiId) ?? null
      );
    },

    async add(anime: Anime) {
      await mutate("add", (current) => {
        if (current.some((item) => item.id === anime.id)) {
          throw new Error(`Anime with id ${anime.id} already exists`);
        }
        const duplicate = duplicateBangumi(current, anime.bangumiId);
        if (duplicate) throw new DuplicateBangumiError(duplicate.id);
        return [...current, structuredClone(anime)];
      });
    },

    async update(id: string, data: Partial<AnimeInput>) {
      await mutate("update", (current) => {
        const index = current.findIndex((anime) => anime.id === id);
        if (index === -1) throw new AnimeNotFoundError(id);

        const next = { ...current[index], ...structuredClone(data) };
        const duplicate = duplicateBangumi(current, next.bangumiId, id);
        if (duplicate) throw new DuplicateBangumiError(duplicate.id);

        current[index] = next;
        return current;
      });
    },

    async remove(id: string) {
      await mutate("delete", (current) => {
        const filtered = current.filter((anime) => anime.id !== id);
        if (filtered.length === current.length) {
          throw new AnimeNotFoundError(id);
        }
        return filtered;
      });
    },

    async listBackups() {
      return adapter.listBackups();
    },

    async getBackup(id: string) {
      return adapter.getBackup(id);
    },

    async replaceAll(data: Anime[], reason: "import") {
      return mutate(reason, () => cloneData(data));
    },

    async restore(id: string) {
      const backup = await adapter.getBackup(id);
      if (!backup) throw new BackupNotFoundError(id);
      return mutate("restore", () => cloneData(backup.data));
    },
  };
}
