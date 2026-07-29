import type { Anime, AnimeInput } from "./types";
import type {
  AnimeState,
  BackupMetadata,
  BackupReason,
  BackupSnapshot,
} from "./backups/types";

export interface CommitInput {
  expectedRevision: number;
  previousData: Anime[];
  nextData: Anime[];
  reason: BackupReason;
  snapshot: BackupMetadata;
}

export type CommitResult =
  | { committed: false }
  | { committed: true; state: AnimeState };

export interface VersionedStorageAdapter {
  readState(): Promise<AnimeState>;
  commit(input: CommitInput): Promise<CommitResult>;
  listBackups(): Promise<BackupMetadata[]>;
  getBackup(id: string): Promise<BackupSnapshot | null>;
  prune(keep: number): Promise<void>;
}

export interface Storage {
  getAll(): Promise<Anime[]>;
  getState(): Promise<AnimeState>;
  findByBangumiId(bangumiId: number): Promise<Anime | null>;
  add(anime: Anime): Promise<void>;
  update(id: string, data: Partial<AnimeInput>): Promise<void>;
  remove(id: string): Promise<void>;
  listBackups(): Promise<BackupMetadata[]>;
  getBackup(id: string): Promise<BackupSnapshot | null>;
  replaceAll(data: Anime[], reason: "import"): Promise<AnimeState>;
  restore(id: string): Promise<AnimeState>;
}
