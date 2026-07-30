"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
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
  const shouldReduceMotion = useReducedMotion();

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
  const tags = Array.isArray(anime.tags) ? anime.tags : [];

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(
    <div
      aria-labelledby="anime-detail-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#211d35]/55 backdrop-blur-md md:items-center md:p-6"
      onClick={closeFromBackdrop}
      role="dialog"
    >
      <motion.article
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative max-h-[94vh] w-full overflow-hidden rounded-t-[2rem] border border-white/80 bg-[var(--canvas)] shadow-[var(--shadow-lg)] md:max-w-[960px] md:rounded-[2rem]"
        initial={{
          opacity: 0,
          scale: shouldReduceMotion ? 1 : 0.985,
          y: shouldReduceMotion ? 0 : 18,
        }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: "easeOut" }}
      >
        <button
          aria-label="关闭详情"
          className="ui-icon-button absolute right-4 top-4 z-20 border border-white/80 bg-white/90 text-xl font-normal text-[var(--ink-muted)] shadow-sm backdrop-blur"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="grid max-h-[94vh] overflow-y-auto md:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.35fr)] md:overflow-hidden">
          <section
            aria-label="作品封面"
            className="relative flex min-h-[290px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#eee5f5] to-[#dce8f4] px-8 py-5 md:min-h-[580px] md:p-8"
          >
            {anime.cover && (
              <>
                <Image
                  alt=""
                  aria-hidden="true"
                  className="scale-110 object-cover opacity-35 blur-2xl"
                  fill
                  sizes="360px"
                  src={anime.cover}
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-[var(--canvas)]/12 to-[#211d35]/25" />
              </>
            )}
            <div className="relative aspect-[2/3] w-[42vw] max-w-[180px] overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/45 shadow-[0_24px_70px_rgba(33,29,53,0.28)] md:w-full md:max-w-[280px] md:rounded-[1.5rem]">
              {anime.cover ? (
                <Image
                  alt={`${anime.title}封面`}
                  className="object-cover"
                  fill
                  priority
                  sizes="280px"
                  src={anime.cover}
                  unoptimized
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--ink-subtle)]">
                  <span aria-hidden="true" className="text-5xl">◌</span>
                  <span className="text-sm font-semibold">封面暂缺</span>
                </div>
              )}
            </div>
          </section>

          <section
            aria-label="追番详情"
            className="relative md:max-h-[94vh] md:overflow-y-auto"
          >
            <div className="space-y-7 px-6 pb-8 pt-7 sm:px-8 md:px-10 md:pb-10 md:pt-16">
              <header>
                <p className="ui-kicker">{anime.season} · MY ARCHIVE</p>
                <h2
                  className="mt-3 text-3xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-4xl"
                  id="anime-detail-title"
                >
                  {anime.title}
                </h2>
                {anime.originalTitle && (
                  <p className="mt-2 text-sm text-[var(--ink-subtle)]">
                    {anime.originalTitle}
                  </p>
                )}
              </header>

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

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
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
                <section className="rounded-[1.5rem] border border-white/80 bg-white/60 p-5">
                  <h3 className="ui-kicker">我的感想</h3>
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
          </section>
        </div>
      </motion.article>
    </div>,
    document.body,
  );
}
