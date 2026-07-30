"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [anime, onClose]);

  if (!anime) return null;
  if (typeof document === "undefined") return null;

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(
    <div
      aria-labelledby="anime-detail-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-end bg-[#211d35]/48 backdrop-blur-sm sm:items-stretch"
      onClick={closeFromBackdrop}
      role="dialog"
    >
      <article className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/80 bg-[var(--canvas)] shadow-[var(--shadow-lg)] sm:max-h-none sm:max-w-xl sm:rounded-none sm:rounded-l-[2rem]">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-pink-100 to-blue-100">
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#211d35]/78 via-[#211d35]/8 to-transparent" />
          <button
            aria-label="关闭详情"
            className="ui-icon-button absolute right-4 top-4 border border-white/80 bg-white/88 text-xl font-normal text-[var(--ink-muted)] shadow-sm backdrop-blur"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
            <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-white/70">
              {anime.season} · MY ARCHIVE
            </p>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl" id="anime-detail-title">
              {anime.title}
            </h2>
            {anime.originalTitle && (
              <p className="mt-1 text-sm text-white/75">
                {anime.originalTitle}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-7 p-6 sm:p-8">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/80 bg-white/72 p-3.5">
              <dt className="text-xs text-[var(--ink-subtle)]">季度</dt>
              <dd className="mt-1 font-bold text-[var(--ink)]">
                {anime.season}
              </dd>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-[var(--warning-soft)] p-3.5">
              <dt className="text-xs text-[var(--warning)]">评分</dt>
              <dd className="mt-1 font-black text-[var(--warning)]">
                ★ {anime.rating}
              </dd>
            </div>
            {anime.episodes > 0 && (
              <div className="rounded-2xl border border-white/80 bg-white/72 p-3.5">
                <dt className="text-xs text-[var(--ink-subtle)]">集数</dt>
                <dd className="mt-1 font-bold text-[var(--ink)]">
                  {anime.episodes} 话
                </dd>
              </div>
            )}
            {anime.airDate && (
              <div className="rounded-2xl border border-white/80 bg-white/72 p-3.5">
                <dt className="text-xs text-[var(--ink-subtle)]">首播</dt>
                <dd className="mt-1 font-bold text-[var(--ink)]">
                  {anime.airDate}
                </dd>
              </div>
            )}
          </dl>

          {anime.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {anime.tags.map((tag) => (
                <span
                  className="ui-chip ui-chip-active min-h-8 px-3 text-xs"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {anime.comment && (
            <section>
              <h3 className="ui-kicker">
                我的感想
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--ink-muted)]">
                {anime.comment}
              </p>
            </section>
          )}

          {anime.bangumiUrl && (
            <a
              className="ui-button ui-button-primary"
              href={anime.bangumiUrl}
              rel="noreferrer"
              target="_blank"
            >
              在 Bangumi 查看
            </a>
          )}
        </div>
      </article>
    </div>,
    document.body,
  );
}
