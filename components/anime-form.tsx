"use client";

import { useState } from "react";
import Image from "next/image";
import type { AnimeInput } from "@/lib/types";
import InlineFeedback from "@/components/feedback/inline-feedback";

const SEASONS = [
  { value: "春", label: "春季-1月" },
  { value: "夏", label: "夏季-4月" },
  { value: "秋", label: "秋季-7月" },
  { value: "冬", label: "冬季-10月" },
];

interface AnimeFormProps {
  initial?: Partial<AnimeInput> | null;
  suggestedTags?: string[];
  submitLabel?: string;
  onSave: (data: AnimeInput) => Promise<void>;
  onCancel: () => void;
}

export default function AnimeForm({
  initial,
  suggestedTags = [],
  submitLabel,
  onSave,
  onCancel,
}: AnimeFormProps) {
  const [title, setTitle] = useState(initial?.title || "");
  const [year, setYear] = useState(initial?.season ? parseInt(initial.season.substring(0, 4)) : 2026);
  const [season, setSeason] = useState(initial?.season ? initial.season.substring(4, 5) : SEASONS[0].value);
  const [cover, setCover] = useState(initial?.cover || "");
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [comment, setComment] = useState(initial?.comment || "");
  const [episodes, setEpisodes] = useState(initial?.episodes ?? 0);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
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
        season: `${year}${season}`,
        cover: cover.trim(),
        rating,
        comment: comment.trim(),
        episodes,
        tags,
        bangumiId: initial?.bangumiId,
        bangumiUrl: initial?.bangumiUrl,
        originalTitle: initial?.originalTitle,
        airDate: initial?.airDate,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleAddSuggestedTag = (tag: string) => {
    setTags((current) =>
      current.includes(tag) ? current : [...current, tag],
    );
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const inputClass =
    "ui-field min-h-11 w-full px-3 py-2.5 text-sm";
  const availableSuggestedTags = [
    ...new Set(suggestedTags.map((tag) => tag.trim()).filter(Boolean)),
  ].filter((tag) => !tags.includes(tag));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <InlineFeedback tone="error" className="font-medium">
          {error}
        </InlineFeedback>
      )}

      {/* Title */}
      <div>
        <label className="mb-2 block text-sm font-bold text-[var(--ink)]">
          标题 <span className="text-[var(--danger)]">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="例如：葬送的芙莉莲"
        />
      </div>

      {/* Year + Season + Episodes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-bold text-[var(--ink)]">年份</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Math.min(9999, Math.max(0, parseInt(e.target.value) || 2026)))}
            className={inputClass}
            placeholder="例如：2024"
            min={0}
            max={9999}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-[var(--ink)]">季度</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            {SEASONS.map((s) => (
              <option key={s.value} value={s.value} className="bg-white text-gray-900">
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-[var(--ink)]">话数</label>
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
        <label className="mb-2 block text-sm font-bold text-[var(--ink)]">封面图片链接</label>
        <input
          type="url"
          value={cover}
          onChange={(e) => setCover(e.target.value)}
          className={inputClass}
          placeholder="https://..."
        />
        {cover && (
          <div className="relative mt-3 aspect-[2/3] w-20 overflow-hidden rounded-xl border border-white/70 bg-white/40 shadow-sm">
            <Image
              src={cover}
              alt="封面预览"
              className="object-cover"
              fill
              sizes="80px"
              unoptimized
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {/* Rating Slider */}
      <div>
        <label className="mb-2 block text-sm font-bold text-[var(--ink)]">
          评分：<span className="text-base font-black text-[var(--warning)]">{rating.toFixed(1)}</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={rating}
            onChange={(e) => setRating(parseFloat(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-pink-300 to-blue-300 accent-[var(--accent)]"
          />
          <div className="flex items-center gap-1 text-xs text-[var(--ink-subtle)]">
            <span>1</span>
            <span>-</span>
            <span>10</span>
          </div>
        </div>
        {/* Visual stars for rating */}
        <div className="mt-2 flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => {
            const threshold = (i + 1) * 2;
            const full = rating >= threshold;
            const half = !full && rating >= threshold - 1;
            
            return (
              <svg
                key={i}
                viewBox="0 0 24 24"
                className={`w-5 h-5 ${full ? 'text-yellow-500' : half ? 'text-yellow-500' : 'text-gray-300'}`}
                fill="currentColor"
                style={half ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="mb-2 block text-sm font-bold text-[var(--ink)]">标签</label>
        {availableSuggestedTags.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-xs text-[var(--ink-muted)]">Bangumi 推荐标签（点击选择）</p>
            <div className="flex flex-wrap gap-2">
              {availableSuggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddSuggestedTag(tag)}
                  className="ui-chip min-h-9 px-3"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            className={`${inputClass} flex-1`}
            placeholder="输入标签后按回车或点击添加"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="ui-button ui-button-primary whitespace-nowrap rounded-xl"
          >
            添加
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="ui-chip ui-chip-active group gap-1.5 px-3"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[var(--ink-subtle)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                  title="删除标签"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comment */}
      <div>
        <label className="mb-2 block text-sm font-bold text-[var(--ink)]">短评</label>
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
          className="ui-button ui-button-primary flex-1 rounded-xl"
        >
          {saving
            ? "保存中..."
            : submitLabel || (initial ? "更新" : "添加")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="ui-button ui-button-secondary rounded-xl px-4"
        >
          取消
        </button>
      </div>
    </form>
  );
}
