"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import Image from "next/image";
import type { Anime } from "@/lib/types";

interface AnimeDetailDialogProps {
  anime: Anime | null;
  onClose: () => void;
}

export default function AnimeDetailDialog({
  anime,
  onClose,
}: AnimeDetailDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!anime) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [anime, onClose]);

  if (!anime) return null;

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      aria-labelledby="anime-detail-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-end bg-gray-950/45 backdrop-blur-sm sm:items-stretch"
      onClick={closeFromBackdrop}
      role="dialog"
    >
      <article className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-h-none sm:max-w-xl sm:rounded-none sm:rounded-l-3xl">
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-pink-100 to-blue-100">
          {anime.cover ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(max-width: 640px) 100vw, 576px"
              src={anime.cover}
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl text-gray-300">
              ◌
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
          <button
            aria-label="关闭详情"
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-gray-700 shadow"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            关闭
          </button>
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <h2 className="text-2xl font-bold" id="anime-detail-title">
              {anime.title}
            </h2>
            {anime.originalTitle && (
              <p className="mt-1 text-sm text-white/75">
                {anime.originalTitle}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6 p-6">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">季度</dt>
              <dd className="mt-1 font-medium text-gray-900">
                {anime.season}
              </dd>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3">
              <dt className="text-xs text-amber-600">评分</dt>
              <dd className="mt-1 font-semibold text-amber-800">
                ★ {anime.rating}
              </dd>
            </div>
            {anime.episodes > 0 && (
              <div className="rounded-2xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">集数</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  {anime.episodes} 话
                </dd>
              </div>
            )}
            {anime.airDate && (
              <div className="rounded-2xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">首播</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  {anime.airDate}
                </dd>
              </div>
            )}
          </dl>

          {anime.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {anime.tags.map((tag) => (
                <span
                  className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-700"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {anime.comment && (
            <section>
              <h3 className="text-xs font-semibold tracking-wider text-gray-500">
                我的感想
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                {anime.comment}
              </p>
            </section>
          )}

          {anime.bangumiUrl && (
            <a
              className="inline-flex rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white"
              href={anime.bangumiUrl}
              rel="noreferrer"
              target="_blank"
            >
              在 Bangumi 查看
            </a>
          )}
        </div>
      </article>
    </div>
  );
}
