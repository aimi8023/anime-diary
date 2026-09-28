"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { Anime } from "@/lib/types";
import { ARCHIVE_MARKS } from "@/lib/anime/marks";
import InlineFeedback from "@/components/feedback/inline-feedback";
import StarRating from "@/components/star-rating";
import { useFocusTrap } from "@/components/use-focus-trap";
import { readApiError } from "@/lib/http/client";

interface QuickRateDialogProps {
  anime: Anime | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function QuickRateDialog({
  anime,
  onClose,
  onSaved,
}: QuickRateDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rating, setRating] = useState(anime?.rating ?? 0);
  const [comment, setComment] = useState(anime?.comment ?? "");
  const [marks, setMarks] = useState<string[]>(anime?.marks ?? []);
  // 未评分时这是“补评分”，已评分时主要用于快速补标记与感想。
  const needsRating = (anime?.rating ?? 0) === 0;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isOpen = Boolean(anime);
  useFocusTrap(panelRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  async function save() {
    if (!anime || rating <= 0 || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/anime/${anime.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim(), marks }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "保存失败"));
      }
      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  if (!anime || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-labelledby="quick-rate-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#211d35]/45 p-4 backdrop-blur-sm"
      onClick={closeFromBackdrop}
      role="dialog"
    >
      <div
        className="ui-panel-strong w-full max-w-md p-6"
        ref={panelRef}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="ui-kicker">
              {needsRating ? "QUICK RATE" : "QUICK MARK"}
            </p>
            <h2
              className="mt-1 truncate text-lg font-black text-[var(--ink)]"
              id="quick-rate-title"
              title={anime.title}
            >
              {needsRating ? "补评分" : "打标记"}《{anime.title}》
            </h2>
          </div>
          <button
            aria-label="关闭补评分"
            className="ui-icon-button border border-white/80 bg-white/90 text-xl font-normal text-[var(--ink-muted)] shadow-sm"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-xs font-bold text-[var(--ink-muted)]">
            标记（可选，可多选）
          </legend>
          <div className="flex flex-wrap gap-2">
            {ARCHIVE_MARKS.map((mark) => {
              const checked = marks.includes(mark.id);
              return (
                <label
                  className={`ui-chip cursor-pointer px-3 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-pink-300 ${
                    checked ? "ui-chip-active" : ""
                  }`}
                  key={mark.id}
                  title={mark.hint}
                >
                  <input
                    checked={checked}
                    className="sr-only"
                    onChange={() =>
                      setMarks((current) =>
                        current.includes(mark.id)
                          ? current.filter((item) => item !== mark.id)
                          : [...current, mark.id],
                      )
                    }
                    type="checkbox"
                  />
                  {mark.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-[var(--ink-muted)]">
            个人评分
          </p>
          <StarRating
            interactive
            onChange={setRating}
            rating={rating}
            size="md"
          />
          {rating === 0 && (
            <p className="mt-2 text-xs text-[var(--ink-subtle)]">
              点击星星打分（1–10），不打分无法保存。
            </p>
          )}
        </div>

        <div className="mt-4">
          <label
            className="mb-2 block text-xs font-bold text-[var(--ink-muted)]"
            htmlFor="quick-rate-comment"
          >
            感想（可选）
          </label>
          <textarea
            className="ui-field min-h-24 w-full px-3 py-2 text-sm"
            id="quick-rate-comment"
            onChange={(event) => setComment(event.target.value)}
            placeholder="一句话记录看完的感受"
            value={comment}
          />
        </div>

        {error && (
          <div className="mt-3">
            <InlineFeedback tone="error">{error}</InlineFeedback>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="ui-button ui-button-secondary"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="ui-button ui-button-primary"
            disabled={rating <= 0 || saving}
            onClick={() => void save()}
            type="button"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
