"use client";

import { useState } from "react";
import type { Anime, AnimeInput, AnimeStatus } from "@/lib/types";

const SEASONS = [
  "2026夏", "2026春", "2026冬",
  "2025秋", "2025夏", "2025春", "2025冬",
  "2024秋", "2024夏", "2024春", "2024冬",
  "2023秋", "2023夏", "2023春", "2023冬",
  "2022秋", "2022夏", "2022春", "2022冬",
];

const STATUSES: AnimeStatus[] = ["想看", "在看", "看完", "弃番"];

// Generate rating options: 1.0, 1.5, 2.0, ... 10.0
const RATINGS = Array.from({ length: 19 }, (_, i) => (i + 2) / 2);

interface AnimeFormProps {
  initial?: Anime | null;
  onSave: (data: AnimeInput) => Promise<void>;
  onCancel: () => void;
}

export default function AnimeForm({ initial, onSave, onCancel }: AnimeFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [season, setSeason] = useState(initial?.season || SEASONS[0]);
  const [cover, setCover] = useState(initial?.cover || "");
  const [rating, setRating] = useState(initial?.rating || 5);
  const [status, setStatus] = useState<AnimeStatus>(initial?.status || "想看");
  const [comment, setComment] = useState(initial?.comment || "");
  const [episodes, setEpisodes] = useState(initial?.episodes || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("请输入番剧标题");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        season,
        cover: cover.trim(),
        rating,
        status,
        comment: comment.trim(),
        episodes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 min-h-[44px] rounded-lg text-sm transition bg-white/6 border border-white/12 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-400/10 text-red-300 text-sm px-4 py-2.5 rounded-lg border border-red-400/20">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">
          标题 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="例如：葬送的芙莉莲"
        />
      </div>

      {/* Season + Episodes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">季度</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            {SEASONS.map((s) => (
              <option key={s} value={s} className="bg-gray-800 text-white">
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">话数</label>
          <input
            type="number"
            value={episodes}
            onChange={(e) => setEpisodes(Math.max(0, parseInt(e.target.value) || 0))}
            className={inputClass}
            min={0}
          />
        </div>
      </div>

      {/* Cover URL */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">封面图片链接</label>
        <input
          type="url"
          value={cover}
          onChange={(e) => setCover(e.target.value)}
          className={inputClass}
          placeholder="https://..."
        />
        {cover && (
          <div className="mt-2 w-16 h-22 rounded-lg overflow-hidden bg-white/5 border border-white/10">
            <img
              src={cover}
              alt="封面预览"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {/* Status + Rating */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">状态</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AnimeStatus)}
            className={`${inputClass} appearance-none`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-gray-800 text-white">
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1.5">
            评分：{rating.toFixed(1)}
          </label>
          <select
            value={rating}
            onChange={(e) => setRating(parseFloat(e.target.value))}
            className={`${inputClass} appearance-none`}
          >
            {RATINGS.map((r) => (
              <option key={r} value={r} className="bg-gray-800 text-white">
                {r.toFixed(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">短评</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="写下你的感受..."
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 min-h-[44px] bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {saving ? "保存中..." : initial ? "更新" : "添加"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 min-h-[44px] text-sm text-white/50 hover:text-white border border-white/15 rounded-lg hover:bg-white/10 transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
}
