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
    <section className="border-t border-gray-100 first:border-t-0">
      <h3>
        <button
          aria-controls={contentId}
          aria-expanded={open}
          aria-label={season}
          className="flex w-full items-center justify-between py-4 text-left"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="font-medium text-gray-800">{season}</span>
          <span className="flex items-center gap-3 text-xs text-gray-500">
            {records.length} 部
            <span aria-hidden="true">{open ? "−" : "+"}</span>
          </span>
        </button>
      </h3>
      {open && (
        <div
          className="grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
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
    <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/55 px-4 shadow-sm sm:px-6">
      <h2>
        <button
          aria-controls={contentId}
          aria-expanded={open}
          aria-label={`${group.year} 年`}
          className="flex w-full items-center justify-between py-5 text-left"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="text-xl font-bold text-gray-900">
            {group.year} 年
          </span>
          <span className="flex items-center gap-3 text-sm text-gray-500">
            {recordCount} 部
            <span aria-hidden="true">{open ? "收起" : "展开"}</span>
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
