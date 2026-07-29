import type { Anime } from "@/lib/types";
import type {
  AnimeBackupFile,
  BackupMetadata,
  DatasetDiff,
} from "./types";

const SAMPLE_LIMIT = 5;

function comparableAnime(anime: Anime): string {
  return JSON.stringify({
    id: anime.id,
    title: anime.title,
    season: anime.season,
    cover: anime.cover,
    rating: anime.rating,
    comment: anime.comment,
    episodes: anime.episodes,
    tags: anime.tags,
    bangumiId: anime.bangumiId,
    bangumiUrl: anime.bangumiUrl,
    originalTitle: anime.originalTitle,
    airDate: anime.airDate,
    createdAt: anime.createdAt,
  });
}

export function diffAnimeData(
  current: Anime[],
  target: Anime[],
): DatasetDiff {
  const currentById = new Map(current.map((anime) => [anime.id, anime]));
  const targetById = new Map(target.map((anime) => [anime.id, anime]));
  const addedTitles: string[] = [];
  const removedTitles: string[] = [];
  const changedTitles: string[] = [];
  let added = 0;
  let removed = 0;
  let changed = 0;
  let unchanged = 0;

  for (const anime of target) {
    const existing = currentById.get(anime.id);
    if (!existing) {
      added += 1;
      if (addedTitles.length < SAMPLE_LIMIT) addedTitles.push(anime.title);
    } else if (comparableAnime(existing) !== comparableAnime(anime)) {
      changed += 1;
      if (changedTitles.length < SAMPLE_LIMIT) changedTitles.push(anime.title);
    } else {
      unchanged += 1;
    }
  }

  for (const anime of current) {
    if (!targetById.has(anime.id)) {
      removed += 1;
      if (removedTitles.length < SAMPLE_LIMIT) removedTitles.push(anime.title);
    }
  }

  return {
    added,
    removed,
    changed,
    unchanged,
    addedTitles,
    removedTitles,
    changedTitles,
  };
}

export function createBackupFile(
  data: Anime[],
  options: {
    source: "current" | "snapshot";
    exportedAt?: string;
    snapshot?: Pick<BackupMetadata, "id" | "createdAt" | "reason">;
  },
): AnimeBackupFile {
  return {
    format: "anime-diary-backup",
    schemaVersion: 1,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    source: options.source,
    ...(options.snapshot ? { snapshot: { ...options.snapshot } } : {}),
    data: structuredClone(data),
  };
}
