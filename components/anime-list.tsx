"use client";

import type { Anime } from "@/lib/types";
import CoverImage from "@/components/cover-image";
import { formatSeasonLabel } from "@/lib/season-label";

interface AnimeListProps {
  animeList: Anime[];
  onEdit: (anime: Anime) => void;
  onDelete: (id: string) => void;
  deleting: string | null;
}

export default function AnimeList({
  animeList,
  onEdit,
  onDelete,
  deleting,
}: AnimeListProps) {
  if (animeList.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[rgba(91,83,112,0.2)] bg-white/38 px-5 py-12 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]"
        >
          ＋
        </span>
        <p className="mt-4 text-sm font-medium text-[var(--ink-muted)]">
          还没有添加任何番剧，点击添加记录开始吧
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {animeList.map((anime) => (
        <div
          key={anime.id}
          className="group flex items-center gap-3 rounded-2xl border border-white/75 bg-white/48 p-2.5 transition-colors hover:bg-white/72 sm:gap-4 sm:p-3"
        >
          <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-white/70 bg-white/40 shadow-sm">
            {anime.cover ? (
              <CoverImage
                alt={`${anime.title}封面`}
                className="object-cover"
                fallbackLabel={anime.title}
                sizes="56px"
                src={anime.cover}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-[var(--ink-subtle)]">
                无
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[var(--ink)] sm:text-base">
              {anime.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-muted)]">
              <span className="font-semibold text-[var(--accent-strong)]">
                {formatSeasonLabel(anime.season)}
              </span>
              {anime.episodes > 0 && <span>{anime.episodes}话</span>}
              <span className="rounded-full bg-[var(--warning-soft)] px-2 py-1 font-bold text-[var(--warning)]">
                ★ {anime.rating}
              </span>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              aria-label={`编辑《${anime.title}》`}
              onClick={() => onEdit(anime)}
              className="ui-button ui-button-secondary min-w-11 px-3 text-xs"
            >
              编辑
            </button>
            <button
              aria-label={`删除《${anime.title}》`}
              onClick={() => onDelete(anime.id)}
              disabled={deleting === anime.id}
              className="ui-button min-w-11 px-3 text-xs text-[var(--ink-subtle)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
            >
              {deleting === anime.id ? "..." : "删除"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
