"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

interface ScrollRowProps {
  children: ReactNode;
}

// —— 平滑滚动调参 ——
const LERP_LAMBDA = 11; // 位置趋近目标的速度（越大越跟手）
const CLICK_STEP_RATIO = 0.75; // 单击箭头滑过的视口比例
const CLICK_STEP_MIN_PX = 320;
const HOLD_DELAY_MS = 300; // 按住多久后进入连续滚动
const HOLD_SPEED_PX_PER_S = 800; // 连续滚动速度
const DRAG_THRESHOLD_PX = 8; // 判定为拖拽的水平位移
const FLING_FACTOR = 0.22; // 松手后的惯性滑行时长（秒）
const FLING_MAX_PX_PER_S = 2600;
const SETTLE_EPSILON_PX = 0.05;

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

interface ArrowButtonProps {
  direction: 1 | -1;
  onHoldStart: (
    direction: 1 | -1,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onHoldEnd: () => void;
}

function ArrowButton({
  direction,
  onHoldStart,
  onHoldEnd,
}: ArrowButtonProps) {
  return (
    <button
      aria-label={direction === -1 ? "向左滚动" : "向右滚动"}
      className={`absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/92 text-[var(--ink)] shadow-[var(--shadow-md)] backdrop-blur transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
        direction === -1 ? "left-2" : "right-2"
      } opacity-0`}
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
 * 无缝循环横向海报行：
 * - 内容渲染两份，滚动位置按单份宽度取模，尾首相接、永无尽头；
 * - 滚轮 / 拖拽 / 箭头全部走同一个 requestAnimationFrame 平滑滚动循环，
 *   滚轮事件在可循环时被完全捕获，页面不会跟着上下滚动；
 * - 单击箭头平滑滑过一段，按住后连续滚动；支持鼠标拖拽与松手惯性。
 */
export default function ScrollRow({ children }: ScrollRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const copy2Ref = useRef<HTMLDivElement>(null);
  const [loop, setLoop] = useState(true);
  const [pointerDown, setPointerDown] = useState(false);

  const loopRef = useRef(true);
  const reduceMotionRef = useRef(false);
  const posRef = useRef(0); // 当前逻辑位置（未取模）
  const targetRef = useRef(0); // 目标位置
  const widthRef = useRef(0); // 单份内容宽度
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const lastAppliedRef = useRef(-1);
  const holdDirRef = useRef<1 | -1 | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const dragRef = useRef<{
    pointerId: number;
    active: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastTime: number;
    velocity: number; // px/s，内容向右移动为正
  } | null>(null);

  const reduceMotion = useReducedMotion();

  useIsoLayoutEffect(() => {
    loopRef.current = loop;
    reduceMotionRef.current = Boolean(reduceMotion);
  });

  function applyScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const width = widthRef.current;
    if (width > 0) {
      const pos = posRef.current;
      if (pos >= width || pos < 0) {
        // 归一化到 [0, width)，target 同步平移以保持相对距离
        const shift = width * Math.floor(pos / width);
        posRef.current -= shift;
        targetRef.current -= shift;
      }
    }
    const next = posRef.current;
    lastAppliedRef.current = next;
    el.scrollLeft = next;
  }

  function tick(now: number) {
    rafRef.current = null;
    const dt = Math.min(Math.max((now - lastTimeRef.current) / 1000, 0), 0.064);
    lastTimeRef.current = now;
    if (dt > 0) {
      const holdDir = holdDirRef.current;
      if (holdDir) {
        targetRef.current += holdDir * HOLD_SPEED_PX_PER_S * dt;
      }
      const diff = targetRef.current - posRef.current;
      if (reduceMotionRef.current || Math.abs(diff) <= SETTLE_EPSILON_PX) {
        posRef.current = targetRef.current;
      } else {
        posRef.current += diff * (1 - Math.exp(-LERP_LAMBDA * dt));
      }
    }
    applyScroll();
    if (posRef.current !== targetRef.current || holdDirRef.current) {
      rafRef.current = window.requestAnimationFrame(tick);
    }
  }

  function startRaf() {
    if (rafRef.current !== null) return;
    lastTimeRef.current = performance.now();
    rafRef.current = window.requestAnimationFrame(tick);
  }

  function stopHold() {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    holdDirRef.current = null;
  }

  function handleHoldStart(
    direction: 1 | -1,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    // 阻止按住时选中文字。
    event.preventDefault();
    if (!loopRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(
      el.clientWidth * CLICK_STEP_RATIO,
      CLICK_STEP_MIN_PX,
    );
    targetRef.current += direction * step;
    startRaf();
    stopHold();
    holdTimeoutRef.current = window.setTimeout(() => {
      holdDirRef.current = direction;
      startRaf();
    }, HOLD_DELAY_MS);
  }

  // —— 测量单份内容宽度并决定是否循环 ——
  // 只在内容或容器尺寸变化时执行，避免与 loop 切换互相触发。
  function measure() {
    const el = scrollerRef.current;
    if (!el) return;
    const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
    // 两份可见时 scrollWidth = 2W - gap；只显示一份时 = W - gap。
    const width = loopRef.current
      ? (el.scrollWidth + gap) / 2
      : el.scrollWidth + gap;
    if (!(width > 0)) return;
    widthRef.current = width;
    const shouldLoop = width > el.clientWidth + 1;
    setLoop(shouldLoop);
    if (!shouldLoop) {
      posRef.current = 0;
      targetRef.current = 0;
      lastAppliedRef.current = 0;
      el.scrollLeft = 0;
    }
  }

  useIsoLayoutEffect(() => {
    measure();
  }, [children]);

  // 副本内容不可聚焦（避免 Tab 穿过重复卡片）。
  useIsoLayoutEffect(() => {
    const copy2 = copy2Ref.current;
    if (!copy2) return;
    copy2
      .querySelectorAll<HTMLElement>(
        "button, a, input, select, textarea, area, [tabindex]",
      )
      .forEach((el) => {
        el.tabIndex = -1;
      });
  }, [children]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 滚轮完全捕获：可循环时页面不随之滚动。
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!loopRef.current) return;
      event.preventDefault();
      let delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      if (event.deltaMode === 1) delta *= 40;
      else if (event.deltaMode === 2) delta *= el.clientWidth;
      if (!delta) return;
      targetRef.current += delta;
      startRaf();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 采纳外部造成的滚动位置变化（如键盘聚焦卡片）。
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const current = el.scrollLeft;
      if (Math.abs(current - lastAppliedRef.current) <= 1) return;
      posRef.current = current;
      targetRef.current = current;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // 拖拽期间点击会被吞掉，这里在捕获阶段拦截。
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClickRef.current) return;
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    };
    el.addEventListener("click", onClickCapture, true);
    return () => el.removeEventListener("click", onClickCapture, true);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      stopHold();
    };
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!loopRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!event.isPrimary) return;
    dragRef.current = {
      pointerId: event.pointerId,
      active: false,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
    };
    suppressClickRef.current = false;
    setPointerDown(true);
  }

  useEffect(() => {
    if (!pointerDown) return;
    const el = scrollerRef.current;
    if (!el) return;

    const endDrag = (event: PointerEvent, fling: boolean) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setPointerDown(false);
      if (!drag.active) return;
      el.style.cursor = "";
      if (fling && !reduceMotionRef.current) {
        const velocity = Math.max(
          -FLING_MAX_PX_PER_S,
          Math.min(FLING_MAX_PX_PER_S, drag.velocity),
        );
        targetRef.current = posRef.current + velocity * FLING_FACTOR;
        startRaf();
      }
    };

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const totalDx = event.clientX - drag.startX;
      const totalDy = event.clientY - drag.startY;
      if (!drag.active) {
        if (Math.abs(totalDx) < DRAG_THRESHOLD_PX) return;
        // 纵向意图让给页面滚动。
        if (Math.abs(totalDx) <= Math.abs(totalDy)) return;
        drag.active = true;
        suppressClickRef.current = true;
        el.style.cursor = "grabbing";
        // 从当前位置开始拖拽，取消进行中的惯性。
        targetRef.current = posRef.current;
      }
      const dx = event.clientX - drag.lastX;
      const dt = (event.timeStamp - drag.lastTime) / 1000;
      if (dt > 0) {
        drag.velocity = drag.velocity * 0.7 + (-dx / dt) * 0.3;
      }
      drag.lastX = event.clientX;
      drag.lastTime = event.timeStamp;
      if (dx) {
        posRef.current -= dx;
        targetRef.current = posRef.current;
        applyScroll();
      }
    };

    const onUp = (event: PointerEvent) => {
      endDrag(event, true);
    };

    const onCancel = (event: PointerEvent) => {
      endDrag(event, false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointerDown]);

  return (
    <div className="group relative">
      <div
        className="flex touch-pan-y select-none gap-2.5 overflow-x-auto pb-2 sm:gap-3 [&::-webkit-scrollbar]:hidden"
        ref={scrollerRef}
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
      >
        <div className="contents">{children}</div>
        <div
          aria-hidden="true"
          className="contents"
          ref={copy2Ref}
          style={loop ? undefined : { display: "none" }}
        >
          {children}
        </div>
      </div>
      {loop && (
        <>
          <ArrowButton
            direction={-1}
            onHoldEnd={stopHold}
            onHoldStart={handleHoldStart}
          />
          <ArrowButton
            direction={1}
            onHoldEnd={stopHold}
            onHoldStart={handleHoldStart}
          />
        </>
      )}
    </div>
  );
}
