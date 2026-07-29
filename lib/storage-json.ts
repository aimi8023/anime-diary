import fs from "node:fs/promises";
import path from "node:path";
import type {
  AnimeState,
  BackupMetadata,
  BackupSnapshot,
} from "./backups/types";
import type {
  CommitInput,
  CommitResult,
  VersionedStorageAdapter,
} from "./storage";
import { createVersionedStorage } from "./storage-core";

interface JsonStorageOptions {
  dataFile?: string;
  revisionFile?: string;
  backupDir?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DEFAULT_DATA_FILE = path.join(DATA_DIR, "anime.json");
const DEFAULT_REVISION_FILE = path.join(DATA_DIR, "anime.revision.json");
const DEFAULT_BACKUP_DIR = path.join(DATA_DIR, "backups");
const BACKUP_INDEX_FILE = "index.json";
const SAFE_BACKUP_ID = /^[A-Za-z0-9_-]+$/;

const writeQueues = new Map<string, Promise<void>>();

async function withWriteLock<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const result = previous.then(operation, operation);
  writeQueues.set(
    key,
    result.then(
      () => undefined,
      () => undefined,
    ),
  );
  return result;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
  const temporary = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
  try {
    await fs.rename(temporary, filePath);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function readJson(filePath: string, label: string): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label}损坏`, { cause: error });
  }
}

function isMetadata(value: unknown): value is BackupMetadata {
  if (typeof value !== "object" || value === null) return false;
  const metadata = value as Record<string, unknown>;
  return (
    typeof metadata.id === "string" &&
    typeof metadata.createdAt === "string" &&
    ["add", "update", "delete", "import", "restore"].includes(
      String(metadata.reason),
    ) &&
    typeof metadata.recordCount === "number" &&
    metadata.schemaVersion === 1
  );
}

class JsonStorageAdapter implements VersionedStorageAdapter {
  private readonly dataFile: string;
  private readonly revisionFile: string;
  private readonly backupDir: string;
  private readonly indexFile: string;

  constructor(options: JsonStorageOptions = {}) {
    this.dataFile = path.resolve(
      /* turbopackIgnore: true */ options.dataFile ?? DEFAULT_DATA_FILE,
    );
    this.revisionFile = path.resolve(
      /* turbopackIgnore: true */
      options.revisionFile ?? DEFAULT_REVISION_FILE,
    );
    this.backupDir = path.resolve(
      /* turbopackIgnore: true */ options.backupDir ?? DEFAULT_BACKUP_DIR,
    );
    this.indexFile = path.join(this.backupDir, BACKUP_INDEX_FILE);
  }

  private backupFile(id: string): string | null {
    if (!SAFE_BACKUP_ID.test(id)) return null;
    const candidate = path.resolve(this.backupDir, `${id}.json`);
    const relative = path.relative(this.backupDir, candidate);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
    return candidate;
  }

  private async ensureDataFile(): Promise<void> {
    if (await pathExists(this.dataFile)) return;
    await atomicWriteJson(this.dataFile, []);
  }

  private async readRevision(): Promise<number> {
    if (!(await pathExists(this.revisionFile))) return 0;
    const parsed = await readJson(this.revisionFile, "数据版本文件");
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Number.isInteger((parsed as { revision?: unknown }).revision) ||
      Number((parsed as { revision: number }).revision) < 0
    ) {
      throw new Error("数据版本文件损坏");
    }
    return Number((parsed as { revision: number }).revision);
  }

  private async readBackupIndex(): Promise<BackupMetadata[]> {
    if (!(await pathExists(this.indexFile))) return [];
    const parsed = await readJson(this.indexFile, "备份索引文件");
    if (!Array.isArray(parsed) || !parsed.every(isMetadata)) {
      throw new Error("备份索引文件损坏");
    }
    return parsed;
  }

  async readState(): Promise<AnimeState> {
    await this.ensureDataFile();
    const parsed = await readJson(this.dataFile, "当前数据文件");
    if (!Array.isArray(parsed)) {
      throw new Error("当前数据文件损坏");
    }
    return {
      revision: await this.readRevision(),
      data: structuredClone(parsed) as AnimeState["data"],
    };
  }

  async commit(input: CommitInput): Promise<CommitResult> {
    return withWriteLock(this.dataFile, async () => {
      const current = await this.readState();
      if (current.revision !== input.expectedRevision) {
        return { committed: false };
      }

      const backupFile = this.backupFile(input.snapshot.id);
      if (!backupFile) throw new Error("备份 ID 非法");

      const snapshot: BackupSnapshot = {
        ...input.snapshot,
        data: structuredClone(current.data),
      };
      const index = await this.readBackupIndex();
      const nextState: AnimeState = {
        revision: current.revision + 1,
        data: structuredClone(input.nextData),
      };

      await atomicWriteJson(backupFile, snapshot);
      await atomicWriteJson(this.indexFile, [...index, input.snapshot]);
      await atomicWriteJson(this.dataFile, nextState.data);
      await atomicWriteJson(this.revisionFile, {
        revision: nextState.revision,
      });

      return { committed: true, state: nextState };
    });
  }

  async listBackups(): Promise<BackupMetadata[]> {
    const index = await this.readBackupIndex();
    return structuredClone(index).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async getBackup(id: string): Promise<BackupSnapshot | null> {
    const backupFile = this.backupFile(id);
    if (!backupFile || !(await pathExists(backupFile))) return null;
    const parsed = await readJson(backupFile, "备份文件");
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !isMetadata(parsed) ||
      !Array.isArray((parsed as { data?: unknown }).data)
    ) {
      throw new Error("备份文件损坏");
    }
    return structuredClone(parsed) as BackupSnapshot;
  }

  async prune(keep: number): Promise<void> {
    await withWriteLock(this.dataFile, async () => {
      const index = (await this.readBackupIndex()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      const retained = index.slice(0, keep);
      const removed = index.slice(keep);
      if (removed.length === 0) return;

      await atomicWriteJson(this.indexFile, retained);
      for (const metadata of removed) {
        const backupFile = this.backupFile(metadata.id);
        if (backupFile) await fs.rm(backupFile, { force: true });
      }
    });
  }
}

export function createJsonStorage(options: JsonStorageOptions = {}) {
  return createVersionedStorage(new JsonStorageAdapter(options));
}

export const jsonStorage = createJsonStorage();
