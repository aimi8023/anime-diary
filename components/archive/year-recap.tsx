"use client";

import { useState } from "react";
import type { YearRecap } from "@/lib/archive/types";

interface YearRecapPanelProps {
  recaps: YearRecap[];
  onSelectYear: (year: string) => void;
}

/**
 * 年度回顾面板：聚合每年的部数、平均分、年度之作与高频标签。
 * 点击年份卡片即应用该年筛选并滚动到档案列表。
 */
export default function YearRecapPanel({
  recaps,
  onSelectYear,
}: YearRecapPanelProps) {
  const [open, setOpen] = useState(false);
  const contentId = "archive-year-recap";

  if (recaps.length === 0) return null;

  return (
    <section className="ui-panel overflow-hidden px-2 sm:px-4">
      <h2>
        <button
          aria-controls={contentId}
          aria-expanded={open}
          className="ui-focus flex min-h-16 w-full items-center justify-between rounded-2xl px-2 py-3 text-left"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="text-xl font-black tracking-tight text-[var(--ink)]">
            年度回顾
          </span>
          <span className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
            <span>{recaps.length} 个年份</span>
            <svg
              aria-hidden="true"
              className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </h2>
      {open && (
        <div
          className="grid grid-cols-1 gap-3 pb-5 sm:grid-cols-2 xl:grid-cols-3"
          id={contentId}
        >
          {recaps.map((recap) => (
            <button
              aria-label={`筛选 ${recap.year} 年的 ${recap.total} 部记录`}
              className="ui-focus group rounded-2xl border border-white/80 bg-white/62 p-4 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
              key={recap.year}
              onClick={() => onSelectYear(recap.year)}
              type="button"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-black tracking-tight text-[var(--ink)]">
                  {recap.year} 年
                </span>
                <span className="text-xs font-bold tabular-nums text-[var(--ink-subtle)]">
                  {recap.total} 部
                  {recap.episodesTotal > 0 && ` · ${recap.episodesTotal} 话`}
                  {" · "}
                  <span className="text-[var(--warning)]">
                    ★ {recap.averageRating.toFixed(1)}
                  </span>
                </span>
              </div>

              {recap.seasonCounts.length > 0 && (
                <p className="mt-1.5 text-xs tabular-nums text-[var(--ink-muted)]">
                  {recap.seasonCounts.map(({ season, count }, index) => (
                    <span key={season}>
                      {index > 0 && (
                        <span
                          aria-hidden="true"
                          className="mx-1.5 text-[var(--ink-subtle)]"
                        >
                          ·
                        </span>
                      )}
                      <span className="font-bold text-[var(--accent-strong)]">
                        {season}
                      </span>{" "}
                      {count}
                    </span>
                  ))}
                </p>
              )}

              {recap.topAnime && (
                <p className="mt-2 truncate text-sm text-[var(--ink)]">
                  <span className="ui-kicker mr-1.5">年度之作</span>
                  {recap.topAnime.title}
                  <span className="ml-1 font-bold text-[var(--warning)]">
                    {recap.topAnime.rating}
                  </span>
                </p>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {recap.topRatedCount > 0 && (
                  <span className="rounded-full border border-amber-100 bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--warning)]">
                    9 分以上 {recap.topRatedCount} 部
                  </span>
                )}
                {recap.topTags.map((tag) => (
                  <span className="ui-chip px-2.5 py-1 text-[11px]" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
