"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

interface ScrollRowProps {
  children: ReactNode;
}

const HOLD_DELAY_MS = 320;
const HOLD_REPEAT_MS = 40;
const HOLD_STEP_PX = 56;

interface ArrowButtonProps {
  direction: 1 | -1;
  active: boolean;
  onHoldStart: (
    direction: 1 | -1,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onHoldEnd: () => void;
}

function ArrowButton({
  direction,
  active,
  onHoldStart,
  onHoldEnd,
}: ArrowButtonProps) {
  return (
    <button
      aria-label={direction === -1 ? "向左滚动" : "向右滚动"}
      className={`absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/92 text-[var(--ink)] shadow-[var(--shadow-md)] backdrop-blur transition-opacity duration-150 ${
        direction === -1 ? "left-2" : "right-2"
      } ${
        active
          ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      disabled={!active}
      onPointerCancel={onHoldEnd}
      onPointerDown={(event) => onHoldStart(direction, event)}
      onPointerLeave={onHoldEnd}
      onPointerUp={onHoldEnd}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        {direction === -1 ? (
          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

/**
 * 横向海报行：原生滚动条隐藏，两侧提供悬停显现的箭头——
 * 单击滚动一段，按住可连续滚动；行内仍支持触屏滑动与滚轮横移。
 */
export default function ScrollRow({ children }: ScrollRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const reduceMotion = useReducedMotion();

  function updateScrollable() {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(maxScroll > 1 && el.scrollLeft < maxScroll - 1);
  }

  function stopHold() {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }

  function handleHoldStart(
    direction: 1 | -1,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    // 阻止按住时选中卡片文字。
    event.preventDefault();
    const el = scrollerRef.current;
    if (!el) return;
    directionRef.current = direction;
    const step = Math.max(el.clientWidth * 0.6, 240);
    el.scrollBy({
      left: direction * step,
      behavior: reduceMotion ? "auto" : "smooth",
    });
    stopHold();
    holdTimeoutRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        scrollerRef.current?.scrollBy({
          left: directionRef.current * HOLD_STEP_PX,
          behavior: "auto",
        });
      }, HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  }

  // 每次渲染后校正一次可用状态（子卡片数量变化时及时更新）。
  useEffect(() => {
    updateScrollable();
  });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateScrollable();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // 鼠标滚轮直接横向滚动行内容；到行边缘时放行页面滚动。
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 1) return;
      const delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      if (!delta) return;
      const canContinue =
        delta > 0 ? el.scrollLeft < maxScroll - 1 : el.scrollLeft > 1;
      if (!canContinue) return;
      event.preventDefault();
      el.scrollLeft += delta;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => stopHold, []);

  return (
    <div className="group relative">
      <div
        className="flex snap-x gap-2.5 overflow-x-auto pb-2 sm:gap-3 [&::-webkit-scrollbar]:hidden"
        ref={scrollerRef}
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
      >
        {children}
      </div>
      <ArrowButton
        active={canLeft}
        direction={-1}
        onHoldEnd={stopHold}
        onHoldStart={handleHoldStart}
      />
      <ArrowButton
        active={canRight}
        direction={1}
        onHoldEnd={stopHold}
        onHoldStart={handleHoldStart}
      />
    </div>
  );
}
