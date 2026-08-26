"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "./use-focus-trap";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 危险操作样式（红色确认按钮）。 */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 设计系统内的确认对话框：替代原生 confirm()，
 * 支持遮罩、Escape、焦点陷阱，初始焦点落在取消按钮上以防误触。
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open || typeof document === "undefined") return null;

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !busy) onCancel();
  }

  return createPortal(
    <div
      aria-labelledby="confirm-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#211d35]/55 p-4 backdrop-blur-md"
      onClick={closeFromBackdrop}
      role="dialog"
    >
      <div
        aria-busy={busy}
        className="w-full max-w-md rounded-[1.5rem] border border-white/85 bg-[var(--canvas)] p-6 shadow-[var(--shadow-lg)] sm:p-7"
        ref={panelRef}
        role="document"
      >
        <p className="ui-kicker">请确认</p>
        <h2
          className="mt-2 text-xl font-black tracking-tight text-[var(--ink)]"
          id="confirm-dialog-title"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="ui-button ui-button-secondary"
            disabled={busy}
            onClick={onCancel}
            ref={cancelRef}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`ui-button ${danger ? "ui-button-danger" : "ui-button-primary"}`}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? "处理中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
