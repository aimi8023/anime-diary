"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { Anime } from "@/lib/types";
import { getYearlyRecap } from "@/lib/archive/filter";
import CoverImage from "@/components/cover-image";
import ScrollRow from "./scroll-row";
import { useFocusTrap } from "@/components/use-focus-trap";

interface YearDrawerProps {
  open: boolean;
  records: Anime[];
  onClose: () => void;
  onSelect: (anime: Anime) => void;
}

/**
 * 年度档案抽屉：右侧滑出，按年滚动浏览。
 * 每年一条横向海报行（按评分从高到低），附部数与均分；
 * 点击海报直接打开该作品详情。
 */
export default function YearDrawer({
  open,
  records,
  onClose,
  onSelect,
}: YearDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  useFocusTrap(panelRef, open);

  // 用 ref 读取最新回调，避免父组件每次渲染都重跑开关副作用。
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const recaps = useMemo(() => getYearlyRecap(records), [records]);
  const recordsByYear = useMemo(() => {
    const byYear = new Map<string, Anime[]>();
    for (const anime of records) {
      const match = anime.season.match(/^(\d{4})[春夏秋冬]$/);
      if (!match) continue;
      const list = byYear.get(match[1]) ?? [];
      list.push(anime);
      byYear.set(match[1], list);
    }
    for (const list of byYear.values()) {
      list.sort(
        (a, b) => b.rating - a.rating || a.title.localeCompare(b.title, "zh-CN"),
      );
    }
    return byYear;
  }, [records]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-labelledby="year-drawer-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-[#211d35]/45 backdrop-blur-sm"
      onClick={closeFromBackdrop}
      role="dialog"
    >
      <motion.aside
        animate={{ x: 0 }}
        aria-label="年度档案"
        className="flex h-full w-[min(430px,94vw)] flex-col border-l border-white/80 bg-[var(--canvas)] shadow-[var(--shadow-lg)]"
        initial={{ x: shouldReduceMotion ? 0 : "100%" }}
        ref={panelRef}
        transition={{ duration: shouldReduceMotion ? 0 : 0.26, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between border-b border-white/70 px-5 py-4">
          <div>
            <p className="ui-kicker">YEARLY ARCHIVE</p>
            <h2
              className="mt-1 text-lg font-black tracking-tight text-[var(--ink)]"
              id="year-drawer-title"
            >
              年度档案
            </h2>
          </div>
          <button
            aria-label="关闭年度档案"
            className="ui-icon-button border border-white/80 bg-white/90 text-xl font-normal text-[var(--ink-muted)] shadow-sm"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          {recaps.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--ink-muted)]">
              还没有可回顾的年份。
            </p>
          )}
          {recaps.map((recap) => (
            <section aria-label={`${recap.year} 年`} key={recap.year}>
              <div className="mb-2.5 flex items-baseline justify-between gap-2">
                <h3 className="text-base font-black tracking-tight text-[var(--ink)]">
                  {recap.year} 年
                </h3>
                <span className="text-xs tabular-nums text-[var(--ink-subtle)]">
                  {recap.total} 部 ·{" "}
                  {recap.averageRating !== null ? (
                    <span className="font-bold text-[var(--warning)]">
                      ★ {recap.averageRating.toFixed(1)}
                    </span>
                  ) : (
                    <span>暂无评分</span>
                  )}
                </span>
              </div>
              <ScrollRow>
                {(recordsByYear.get(recap.year) ?? []).map((anime) => (
                  <button
                    aria-label={`查看《${anime.title}》详情`}
                    className="ui-focus group w-[108px] shrink-0 text-left"
                    key={anime.id}
                    onClick={() => onSelect(anime)}
                    type="button"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/80 bg-white/60 shadow-[var(--shadow-sm)] transition-transform duration-200 group-hover:-translate-y-0.5">
                      {anime.cover ? (
                        <CoverImage
                          alt=""
                          className="object-cover"
                          fallbackLabel={anime.title}
                          sizes="108px"
                          src={anime.cover}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl font-black text-[var(--ink-subtle)]">
                          {anime.title.charAt(0) || "◌"}
                        </div>
                      )}
                      <span
                        className={`absolute right-1.5 top-1.5 rounded-full border border-white/80 px-1.5 py-0.5 text-[10px] font-black ${
                          anime.rating > 0
                            ? "bg-[rgba(255,248,228,0.92)] text-[var(--warning)]"
                            : "bg-[rgba(255,255,255,0.85)] text-[var(--ink-subtle)]"
                        }`}
                      >
                        {anime.rating > 0 ? `★ ${anime.rating}` : "未评分"}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-[var(--ink)]">
                      {anime.title}
                    </p>
                  </button>
                ))}
              </ScrollRow>
            </section>
          ))}
        </div>
      </motion.aside>
    </div>,
    document.body,
  );
}
