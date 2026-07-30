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
    <div className="space-y-5">
      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入中文或日文标题"
          className="ui-field min-h-11 flex-1 px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="ui-button ui-button-primary min-w-24 rounded-xl"
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
        <p className="rounded-2xl border border-dashed border-[rgba(91,83,112,0.18)] bg-white/35 py-8 text-center text-sm text-[var(--ink-muted)]">
          没有找到匹配的动画条目
        </p>
      )}

      {results.length > 0 && (
        <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
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
                className="ui-focus flex w-full items-center gap-3 rounded-2xl border border-white/70 bg-white/42 p-3 text-left transition-colors hover:bg-white/72 disabled:opacity-60"
              >
                <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-white/70 bg-white/35 shadow-sm">
                  {result.cover ? (
                    <Image
                      src={result.cover}
                      alt=""
                      width={48}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[var(--ink-subtle)]">
                      无图
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-[var(--ink)]">
                      {result.title}
                    </span>
                    {result.alreadyAdded && (
                      <span className="flex-shrink-0 rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--info)]">
                        已收录
                      </span>
                    )}
                  </div>
                  {result.originalTitle !== result.title && (
                    <p className="truncate text-xs text-[var(--ink-subtle)]">
                      {result.originalTitle}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {result.airDate || "日期未知"} ·{" "}
                    {result.episodes > 0
                      ? `${result.episodes} 话`
                      : "话数未知"}
                  </p>
                </div>
                <span className="text-xs font-bold text-[var(--info)]">
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
        className="ui-button ui-button-secondary w-full rounded-xl"
      >
        改为手动填写
      </button>
    </div>
  );
}
