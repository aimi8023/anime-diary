"use client";

import { useState } from "react";
import type { AnimeInput } from "@/lib/types";

const SEASONS = [
  { value: "春", label: "春季-1月" },
  { value: "夏", label: "夏季-4月" },
  { value: "秋", label: "秋季-7月" },
  { value: "冬", label: "冬季-10月" },
];

interface AnimeFormProps {
  initial?: Partial<AnimeInput> | null;
  suggestedTags?: string[];
  onSave: (data: AnimeInput) => Promise<void>;
  onCancel: () => void;
}

export default function AnimeForm({
  initial,
  suggestedTags = [],
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
    "w-full px-3 py-2.5 min-h-[44px] rounded-lg text-sm transition glass-input focus:outline-none";
  const availableSuggestedTags = [
    ...new Set(suggestedTags.map((tag) => tag.trim()).filter(Boolean)),
  ].filter((tag) => !tags.includes(tag));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-400/40 font-medium">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">
          标题 <span className="text-red-500">*</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">年份</label>
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
          <label className="block text-sm font-medium text-gray-800 mb-1.5">季度</label>
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
          <label className="block text-sm font-medium text-gray-800 mb-1.5">话数</label>
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
        <label className="block text-sm font-medium text-gray-800 mb-1.5">封面图片链接</label>
        <input
          type="url"
          value={cover}
          onChange={(e) => setCover(e.target.value)}
          className={inputClass}
          placeholder="https://..."
        />
        {cover && (
          <div className="mt-2 w-16 h-22 rounded-lg overflow-hidden bg-white/30 border border-white/50">
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

      {/* Rating Slider */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-2">
          评分：<span className="text-pink-600 font-bold text-base">{rating.toFixed(1)}</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={rating}
            onChange={(e) => setRating(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gradient-to-r from-pink-400 to-blue-400 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <div className="flex items-center gap-1 text-xs text-gray-600">
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
        <label className="block text-sm font-medium text-gray-800 mb-1.5">标签</label>
        {availableSuggestedTags.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">Bangumi 推荐标签（点击选择）</p>
            <div className="flex flex-wrap gap-2">
              {availableSuggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddSuggestedTag(tag)}
                  className="px-3 py-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 text-sm text-gray-700 hover:bg-blue-500/20 transition-colors"
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
            className="px-4 min-h-[44px] bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
          >
            添加
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500/10 to-blue-500/10 border border-pink-400/30 text-sm text-gray-700 group hover:border-red-400/50 transition-colors"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-0.5 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-red-600 transition-colors rounded-full hover:bg-red-500/10"
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
        <label className="block text-sm font-medium text-gray-700 mb-1.5">短评</label>
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
          className="flex-1 min-h-[44px] bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          {saving ? "保存中..." : initial ? "更新" : "添加"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 min-h-[44px] text-sm text-gray-700 hover:text-gray-900 border border-white/60 rounded-lg hover:bg-white/40 transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
}
