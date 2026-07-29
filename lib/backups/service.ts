import { Buffer } from "node:buffer";
import type { Storage } from "@/lib/storage";
import { BackupNotFoundError } from "@/lib/storage-core";
import { createBackupFile, diffAnimeData } from "./diff";
import type {
  BackupIssue,
  BackupMetadata,
  DatasetDiff,
} from "./types";
import {
  parseBackupJson,
  validateBackupSize,
} from "./validation";

export class BackupImportError extends Error {
  readonly code = "backup_import_invalid";
  issues: BackupIssue[];

  constructor(issues: BackupIssue[]) {
    super(issues[0]?.message ?? "备份文件校验失败");
    this.name = "BackupImportError";
    this.issues = issues;
  }
}

export class EmptyImportConfirmationError extends Error {
  readonly code = "empty_confirmation_required";

  constructor() {
    super("导入空备份需要额外确认");
    this.name = "EmptyImportConfirmationError";
  }
}

interface BackupServiceOptions {
  now?: () => string;
}

export interface ImportPreview {
  format: "legacy" | "versioned";
  recordCount: number;
  isEmpty: boolean;
  warnings: BackupIssue[];
  diff: DatasetDiff;
}

function metadataOf(
  snapshot: Awaited<ReturnType<Storage["getBackup"]>> & object,
): BackupMetadata {
  const { data: _data, ...metadata } = snapshot;
  return metadata;
}

export function createBackupService(
  storage: Storage,
  options: BackupServiceOptions = {},
) {
  const now = options.now ?? (() => new Date().toISOString());

  async function parseImport(raw: string) {
    const size = validateBackupSize(Buffer.byteLength(raw, "utf8"));
    if (!size.ok) throw new BackupImportError([size.issue]);

    const parsed = parseBackupJson(raw);
    if (!parsed.ok) throw new BackupImportError(parsed.issues);
    return parsed;
  }

  return {
    async list() {
      return storage.listBackups();
    },

    async previewImport(raw: string): Promise<ImportPreview> {
      const parsed = await parseImport(raw);
      const current = await storage.getState();
      return {
        format: parsed.format,
        recordCount: parsed.data.length,
        isEmpty: parsed.isEmpty,
        warnings: parsed.warnings,
        diff: diffAnimeData(current.data, parsed.data),
      };
    },

    async applyImport(
      raw: string,
      options: { confirmEmpty: boolean },
    ): Promise<{ revision: number; recordCount: number }> {
      const parsed = await parseImport(raw);
      if (parsed.isEmpty && !options.confirmEmpty) {
        throw new EmptyImportConfirmationError();
      }
      const state = await storage.replaceAll(parsed.data, "import");
      return { revision: state.revision, recordCount: state.data.length };
    },

    async previewSnapshot(id: string) {
      const snapshot = await storage.getBackup(id);
      if (!snapshot) throw new BackupNotFoundError(id);
      const current = await storage.getState();
      return {
        metadata: metadataOf(snapshot),
        diff: diffAnimeData(current.data, snapshot.data),
      };
    },

    async restore(id: string) {
      const snapshot = await storage.getBackup(id);
      if (!snapshot) throw new BackupNotFoundError(id);
      const state = await storage.restore(id);
      return {
        restoredSnapshot: metadataOf(snapshot),
        revision: state.revision,
        recordCount: state.data.length,
      };
    },

    async exportCurrent() {
      const current = await storage.getState();
      return createBackupFile(current.data, {
        source: "current",
        exportedAt: now(),
      });
    },

    async exportSnapshot(id: string) {
      const snapshot = await storage.getBackup(id);
      if (!snapshot) throw new BackupNotFoundError(id);
      return createBackupFile(snapshot.data, {
        source: "snapshot",
        exportedAt: now(),
        snapshot: metadataOf(snapshot),
      });
    },
  };
}
