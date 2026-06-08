"use client";

import type { Anime } from "@/lib/types";
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
      <p className="text-center text-gray-600 py-8 text-sm">
        还没有添加任何番剧，用下方表单开始吧
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {animeList.map((anime) => (
        <div
          key={anime.id}
          className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-white/50 hover:bg-white/40 transition-colors"
        >
          {/* Mini cover */}
          <div className="w-10 h-14 rounded-md overflow-hidden bg-white/20 flex-shrink-0 border border-white/40">
            {anime.cover ? (
              <img
                src={anime.cover}
                alt={anime.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400/50 text-xs">
                无
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">
                {anime.title}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
              <span>{anime.season}</span>
              {anime.episodes > 0 && <span>{anime.episodes}话</span>}
              <StarRating rating={anime.rating} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(anime)}
              className="px-2.5 py-2 text-xs text-gray-700 hover:text-blue-600 hover:bg-white/50 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              编辑
            </button>
            <button
              onClick={() => onDelete(anime.id)}
              disabled={deleting === anime.id}
              className="px-2.5 py-2 text-xs text-gray-600 hover:text-red-500 hover:bg-white/50 rounded-md transition-colors disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {deleting === anime.id ? "..." : "删除"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
