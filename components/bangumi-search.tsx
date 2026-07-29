"use client";

import { useState } from "react";
import Image from "next/image";
import type {
  BangumiPrefill,
  BangumiSearchResult,
} from "@/lib/bangumi/types";
import InlineFeedback from "@/components/feedback/inline-feedback";
import { readApiError } from "@/lib/http/client";

interface BangumiSearchProps {
  onSelect: (prefill: BangumiPrefill) => void;
  onEditExisting: (localAnimeId: string) => void;
  onUseManual: () => void;
}

export default function BangumiSearch({
  onSelect,
  onEditExisting,
  onUseManual,
}: BangumiSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BangumiSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    const keyword = query.trim();
    if (!keyword) {
      setError("请输入要搜索的番剧名称");
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(false);
    try {
      const response = await fetch(
        `/api/bangumi/search?q=${encodeURIComponent(keyword)}`,
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "搜索失败，请稍后再试"),
        );
      }
      setResults((await response.json()) as BangumiSearchResult[]);
      setHasSearched(true);
    } catch (searchError) {
      setResults([]);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "搜索失败，请稍后再试",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (result: BangumiSearchResult) => {
    if (result.alreadyAdded && result.localAnimeId) {
      onEditExisting(result.localAnimeId);
      return;
    }
    if (selectingId !== null) return;

    setSelectingId(result.bangumiId);
    setError("");
    try {
      const response = await fetch(
        `/api/bangumi/subjects/${result.bangumiId}`,
      );
      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            "读取条目详情失败，请稍后再试",
          ),
        );
      }
      onSelect((await response.json()) as BangumiPrefill);
    } catch (selectError) {
      setError(
        selectError instanceof Error
          ? selectError.message
          : "读取条目详情失败，请稍后再试",
      );
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入中文或日文标题"
          className="flex-1 px-3 py-2.5 min-h-[44px] rounded-lg text-sm glass-input focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-w-20 px-4 py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-blue-500 text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? "搜索中..." : "搜索"}
        </button>
      </form>

      {error && (
        <InlineFeedback tone="error">
          {error}
        </InlineFeedback>
      )}

      {hasSearched && results.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-600">
          没有找到匹配的动画条目
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-[440px] overflow-y-auto">
          {results.map((result) => {
            const actionLabel = result.alreadyAdded
              ? `编辑已收录的 ${result.title}`
              : `选择 ${result.title}`;
            return (
              <button
                key={result.bangumiId}
                type="button"
                aria-label={actionLabel}
                disabled={selectingId !== null}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 rounded-xl border border-white/50 bg-white/25 p-3 text-left hover:bg-white/45 disabled:opacity-60 transition-colors"
              >
                <div className="w-12 h-16 flex-shrink-0 overflow-hidden rounded-md bg-white/30">
                  {result.cover ? (
                    <Image
                      src={result.cover}
                      alt=""
                      width={48}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                      无图
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-gray-900">
                      {result.title}
                    </span>
                    {result.alreadyAdded && (
                      <span className="flex-shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700">
                        已收录
                      </span>
                    )}
                  </div>
                  {result.originalTitle !== result.title && (
                    <p className="truncate text-xs text-gray-500">
                      {result.originalTitle}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-600">
                    {result.airDate || "日期未知"} ·{" "}
                    {result.episodes > 0
                      ? `${result.episodes} 话`
                      : "话数未知"}
                  </p>
                </div>
                <span className="text-xs font-medium text-blue-600">
                  {selectingId === result.bangumiId
                    ? "读取中..."
                    : result.alreadyAdded
                      ? "编辑"
                      : "选择"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onUseManual}
        className="w-full min-h-[44px] rounded-lg border border-white/60 text-sm text-gray-700 hover:bg-white/40"
      >
        改为手动填写
      </button>
    </div>
  );
}
