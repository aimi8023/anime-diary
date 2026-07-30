"use client";

import { useState } from "react";
import type { Anime } from "@/lib/types";
import type { ArchiveYearGroup } from "@/lib/archive/types";
import ArchiveAnimeCard from "./archive-anime-card";

interface SeasonSectionProps {
  season: string;
  records: Anime[];
  onSelect: (anime: Anime) => void;
}

function SeasonSection({
  season,
  records,
  onSelect,
}: SeasonSectionProps) {
  const [open, setOpen] = useState(true);
  const contentId = `archive-season-${season}`;

  return (
    <section className="border-t border-[rgba(91,83,112,0.1)] first:border-t-0">
      <h3>
        <button
          aria-controls={contentId}
          aria-expanded={open}
          aria-label={season}
          className="ui-focus flex min-h-12 w-full items-center justify-between rounded-xl px-2 py-2 text-left"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="font-bold text-[var(--ink)]">{season}</span>
          <span className="flex items-center gap-2 text-xs text-[var(--ink-subtle)]">
            <span className="rounded-full bg-white/70 px-2.5 py-1">
              {records.length} 部
            </span>
            <svg
              aria-hidden="true"
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </h3>
      {open && (
        <div
          className="grid grid-cols-2 gap-2.5 pb-5 min-[420px]:grid-cols-3 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6 xl:grid-cols-7"
          id={contentId}
        >
          {records.map((anime, index) => (
            <ArchiveAnimeCard
              anime={anime}
              index={index}
              key={anime.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface YearSectionProps {
  group: ArchiveYearGroup;
  initiallyOpen: boolean;
  onSelect: (anime: Anime) => void;
}

export default function YearSection({
  group,
  initiallyOpen,
  onSelect,
}: YearSectionProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const contentId = `archive-year-${group.year}`;
  const recordCount = group.seasons.reduce(
    (total, season) => total + season.records.length,
    0,
  );

  return (
    <section className="ui-panel overflow-hidden px-2 sm:px-4">
      <h2>
        <button
          aria-controls={contentId}
          aria-expanded={open}
          aria-label={`${group.year} 年`}
          className="ui-focus flex min-h-16 w-full items-center justify-between rounded-2xl px-2 py-3 text-left"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="text-xl font-black tracking-tight text-[var(--ink)]">
            {group.year} 年
          </span>
          <span className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
            <span>{recordCount} 部</span>
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
        <div id={contentId}>
          {group.seasons.map((season) => (
            <SeasonSection
              key={season.season}
              onSelect={onSelect}
              records={season.records}
              season={season.season}
            />
          ))}
        </div>
      )}
    </section>
  );
}
