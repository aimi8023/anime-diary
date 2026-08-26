"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { Anime } from "@/lib/types";
import CoverImage from "@/components/cover-image";
import { useFocusTrap } from "./use-focus-trap";

interface AnimeDetailDialogProps {
  anime: Anime | null;
  onClose: () => void;
  /** 在当前筛选结果中移动相对步长；不提供时隐藏切换控件。 */
  onNavigate?: (delta: 1 | -1) => void;
  /** 当前记录在结果序列中的位置，用于边界判断与计数展示。 */
  position?: { index: number; total: number } | null;
  /** 单条记录分享路径（如 /?anime=id）；提供时显示复制链接按钮。 */
  sharePath?: string | null;
}

export default function AnimeDetailDialog({
  anime,
  onClose,
  onNavigate,
  position,
  sharePath,
}: AnimeDetailDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const paneScrollRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);

  // 用 ref 读取最新回调，让开关生命周期只依赖“是否打开”，
  // 切换相邻记录时不会重新锁定滚动或打断焦点。
  const onCloseRef = useRef(onClose);
  const onNavigateRef = useRef(onNavigate);
  useEffect(() => {
    onCloseRef.current = onClose;
    onNavigateRef.current = onNavigate;
  });

  const isOpen = Boolean(anime);
  useFocusTrap(panelRef, isOpen);
  const canNavigate = Boolean(onNavigate && position && position.total > 1);
  const navIndex = canNavigate && position ? position.index : 0;
  const navTotal = canNavigate && position ? position.total : 0;
  const hasPrev = canNavigate && navIndex > 0;
  const hasNext = canNavigate && navIndex < navTotal - 1;

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
      if (!onNavigateRef.current) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCopied(false);
        onNavigateRef.current(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setCopied(false);
        onNavigateRef.current(1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  // 切换到相邻记录时，把两个滚动容器都回到顶部，避免停留在上一部的位置。
  useEffect(() => {
    if (mobileScrollRef.current) mobileScrollRef.current.scrollTop = 0;
    if (paneScrollRef.current) paneScrollRef.current.scrollTop = 0;
  }, [anime?.id]);

  async function copyShareLink() {
    if (!sharePath) return;
    const url = `${window.location.origin}${sharePath}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // 剪贴板 API 不可用时的兜底（http 环境或旧浏览器）。
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

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
        ref={panelRef}
        transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: "easeOut" }}
      >
        <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5">
          {canNavigate && (
            <>
              <span
                aria-hidden="true"
                className="mr-1 hidden rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[11px] font-bold tabular-nums text-[var(--ink-muted)] shadow-sm backdrop-blur sm:block"
              >
                {navIndex + 1} / {navTotal}
              </span>
              <button
                aria-label="上一部"
                className="ui-icon-button border border-white/80 bg-white/90 shadow-sm backdrop-blur"
                disabled={!hasPrev}
                onClick={() => {
                  setCopied(false);
                  onNavigate?.(-1);
                }}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                aria-label="下一部"
                className="ui-icon-button border border-white/80 bg-white/90 shadow-sm backdrop-blur"
                disabled={!hasNext}
                onClick={() => {
                  setCopied(false);
                  onNavigate?.(1);
                }}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
          <button
            aria-label="关闭详情"
            className="ui-icon-button border border-white/80 bg-white/90 text-xl font-normal text-[var(--ink-muted)] shadow-sm backdrop-blur"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div
          className="grid max-h-[94vh] overflow-y-auto md:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.35fr)] md:overflow-hidden"
          ref={mobileScrollRef}
        >
          <section
            aria-label="作品封面"
            className="relative flex min-h-[290px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#eee5f5] to-[#dce8f4] px-8 py-5 md:min-h-[580px] md:p-8"
          >
            {anime.cover && (
              <>
                <CoverImage
                  alt=""
                  className="scale-110 object-cover opacity-35 blur-2xl"
                  fallbackMode="hidden"
                  sizes="360px"
                  src={anime.cover}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-[var(--canvas)]/12 to-[#211d35]/25" />
              </>
            )}
            <div className="relative aspect-[2/3] w-[42vw] max-w-[180px] overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/45 shadow-[0_24px_70px_rgba(33,29,53,0.28)] md:w-full md:max-w-[280px] md:rounded-[1.5rem]">
              {anime.cover ? (
                <CoverImage
                  alt={`${anime.title}封面`}
                  className="object-cover"
                  fallbackLabel={anime.title}
                  priority
                  sizes="280px"
                  src={anime.cover}
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
            ref={paneScrollRef}
          >
            <div className="space-y-7 px-6 pb-8 pt-7 sm:px-8 md:px-10 md:pb-10 md:pt-16">
              <header aria-live="polite">
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

              {(anime.bangumiUrl || sharePath) && (
                <div className="flex flex-wrap gap-3">
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
                  {sharePath && (
                    <button
                      className="ui-button ui-button-secondary"
                      onClick={() => {
                        void copyShareLink();
                      }}
                      type="button"
                    >
                      {copied ? "链接已复制 ✓" : "复制分享链接"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </motion.article>
    </div>,
    document.body,
  );
}
