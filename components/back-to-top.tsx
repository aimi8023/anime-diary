"use client";

import { useEffect, useState } from "react";

const SHOW_AFTER_PIXELS = 600;

/**
 * 返回顶部浮动按钮：滚过一屏后出现，
 * 遵循 prefers-reduced-motion 时直接跳转。
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const updateVisible = () => setVisible(window.scrollY > SHOW_AFTER_PIXELS);
    updateVisible();
    window.addEventListener("scroll", updateVisible, { passive: true });
    return () => window.removeEventListener("scroll", updateVisible);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <button
      aria-hidden={!visible}
      aria-label="返回顶部"
      className={`ui-icon-button fixed bottom-6 right-6 z-40 border border-white/80 bg-white/90 shadow-[var(--shadow-md)] transition-[opacity,transform] duration-200 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: reduceMotion ? "auto" : "smooth",
        })
      }
      tabIndex={visible ? 0 : -1}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          d="M5 15l7-7 7 7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
