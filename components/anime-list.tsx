"use client";

import type { Anime } from "@/lib/types";
import StatusBadge from "./status-badge";
import StarRating from "./star-rating";

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
      <p className="text-center text-white/30 py-8 text-sm">
        还没有添加任何番剧，用下方表单开始吧
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {animeList.map((anime) => (
        <div
          key={anime.id}
          className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-white/8 hover:bg-white/5 transition-colors"
        >
          {/* Mini cover */}
          <div className="w-10 h-14 rounded-md overflow-hidden bg-white/5 flex-shrink-0 border border-white/5">
            {anime.cover ? (
              <img
                src={anime.cover}
                alt={anime.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/15 text-xs">
                无
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/80 truncate">
                {anime.title}
              </span>
              <StatusBadge status={anime.status} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/35">
              <span>{anime.season}</span>
              {anime.episodes > 0 && <span>{anime.episodes}话</span>}
              <StarRating rating={anime.rating} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(anime)}
              className="px-2.5 py-2 text-xs text-white/40 hover:text-amber-400 hover:bg-white/10 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              编辑
            </button>
            <button
              onClick={() => onDelete(anime.id)}
              disabled={deleting === anime.id}
              className="px-2.5 py-2 text-xs text-white/30 hover:text-red-400 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {deleting === anime.id ? "..." : "删除"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
