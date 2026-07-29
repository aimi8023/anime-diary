import type { Anime } from "@/lib/types";

export type BackupReason = "add" | "update" | "delete" | "import" | "restore";

export interface AnimeState {
  revision: number;
  data: Anime[];
}

export interface BackupMetadata {
  id: string;
  createdAt: string;
  reason: BackupReason;
  recordCount: number;
  schemaVersion: 1;
}

export interface BackupSnapshot extends BackupMetadata {
  data: Anime[];
}

export interface AnimeBackupFile {
  format: "anime-diary-backup";
  schemaVersion: 1;
  exportedAt: string;
  source: "current" | "snapshot";
  snapshot?: Pick<BackupMetadata, "id" | "createdAt" | "reason">;
  data: Anime[];
}

export interface DatasetDiff {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  addedTitles: string[];
  removedTitles: string[];
  changedTitles: string[];
}

export interface BackupIssue {
  code: string;
  message: string;
  recordIndex?: number;
  field?: string;
}

export type BackupParseResult =
  | {
      ok: true;
      data: Anime[];
      warnings: BackupIssue[];
      isEmpty: boolean;
      format: "legacy" | "versioned";
    }
  | {
      ok: false;
      issues: BackupIssue[];
    };
