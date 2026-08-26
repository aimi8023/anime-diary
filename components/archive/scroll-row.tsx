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

type RowMode = "static" | "clamp" | "loop";

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

interface ArrowButtonProps {
  direction: 1 | -1;
  disabled?: boolean;
  onHoldStart: (
    direction: 1 | -1,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onHoldEnd: () => void;
}

function ArrowButton({
  direction,
  disabled = false,
  onHoldStart,
  onHoldEnd,
}: ArrowButtonProps) {
  return (
    <button
      aria-label={direction === -1 ? "向左滚动" : "向右滚动"}
      className={`absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/92 text-[var(--ink)] shadow-[var(--shadow-md)] backdrop-blur transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
        direction === -1 ? "left-2" : "right-2"
      } ${disabled ? "pointer-events-none opacity-0" : "opacity-0"}`}
      disabled={disabled}
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
 * 横向海报行，按内容多少自动选择三种模式：
 * - static：单份内容放得下，静态展示，不捕获任何输入；
 * - clamp：内容略超出视口，钳制滚动（到边即停），滚轮到边后交还页面；
 * - loop：内容充足，渲染两份、按单份宽度取模，首尾无缝循环，
 *   滚轮被完全捕获，页面不随之滚动。
 * 所有滚动都经过同一个 requestAnimationFrame 缓动循环；
 * 宽度用副本盒子的 offsetWidth 测量——scrollWidth 会被浏览器
 * 抬到 clientWidth，用它测短内容会得到错误结果。
 */
export default function ScrollRow({ children }: ScrollRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const copy1Ref = useRef<HTMLDivElement>(null);
  const copy2Ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<RowMode>("loop");
  const [edges, setEdges] = useState({ left: false, right: false });
  const [pointerDown, setPointerDown] = useState(false);

  const modeRef = useRef<RowMode>("loop");
  const reduceMotionRef = useRef(false);
  const posRef = useRef(0); // 当前逻辑位置
  const targetRef = useRef(0); // 目标位置
  const widthRef = useRef(0); // 单份内容宽度（含接缝 gap）
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const lastAppliedRef = useRef(-1);
  const holdDirRef = useRef<1 | -1 | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const edgesRef = useRef({ left: false, right: false });

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
    modeRef.current = mode;
    reduceMotionRef.current = Boolean(reduceMotion);
  });

  /** 视口内可滚动的最大位移（loop 模式下为无限，用 Infinity 表示）。 */
  function maxScroll(): number {
    const el = scrollerRef.current;
    if (!el) return 0;
    if (modeRef.current === "loop") return Number.POSITIVE_INFINITY;
    // clamp/static：真实内容边界（scrollWidth 此时可信）。
    return Math.max(0, el.scrollWidth - el.clientWidth);
  }

  function applyScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    if (modeRef.current === "loop") {
      const width = widthRef.current;
      if (width > 0) {
        const pos = posRef.current;
        if (pos >= width || pos < 0) {
          // 归一化到 [0, width)，target 同步平移以保持相对距离。
          const shift = width * Math.floor(pos / width);
          posRef.current -= shift;
          targetRef.current -= shift;
        }
      }
    } else {
      // clamp：到边即停。
      const max = maxScroll();
      if (posRef.current > max) posRef.current = max;
      if (posRef.current < 0) posRef.current = 0;
      if (targetRef.current > max) targetRef.current = max;
      if (targetRef.current < 0) targetRef.current = 0;
      updateEdges(posRef.current);
    }
    const next = posRef.current;
    lastAppliedRef.current = next;
    el.scrollLeft = next;
  }

  /** clamp 模式下更新两侧箭头的可用状态（仅在变化时触发渲染）。 */
  function updateEdges(pos: number) {
    const max = maxScroll();
    const next = {
      left: pos > 1,
      right: pos < max - 1,
    };
    const prev = edgesRef.current;
    if (prev.left !== next.left || prev.right !== next.right) {
      edgesRef.current = next;
      setEdges(next);
    }
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
    if (modeRef.current === "static") return;
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

  // —— 测量单份内容宽度并决定滚动模式 ——
  // 宽度读第一份副本盒子的 offsetWidth（真实布局盒，不受 clientWidth 抬升影响），
  // 与第二份是否可见无关，因此反复测量结果稳定，不会来回翻转。
  function measure() {
    const el = scrollerRef.current;
    const copy1 = copy1Ref.current;
    if (!el || !copy1) return;
    const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
    // 一份周期 = 副本内容 + 接缝 gap。
    const width = copy1.offsetWidth + gap;
    if (!(width > 0)) return;
    widthRef.current = width;
    const overflow = width - el.clientWidth;
    // 内容明显超出视口才循环；只多一点的走钳制模式，避免"刚滑一点就绕回来"。
    const loopMin = Math.max(160, el.clientWidth * 0.12);
    const nextMode: RowMode =
      overflow >= loopMin ? "loop" : overflow > 1 ? "clamp" : "static";
    setMode(nextMode);
    if (nextMode !== "loop") {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      if (posRef.current > max) posRef.current = max;
      if (targetRef.current > max) targetRef.current = max;
      if (posRef.current < 0) posRef.current = 0;
      if (targetRef.current < 0) targetRef.current = 0;
      updateEdges(posRef.current);
      el.scrollLeft = posRef.current;
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
    // measure 通过 ref 通信，闭包过期无副作用。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 滚轮：loop 模式完全捕获；clamp 模式捕获到边为止，到边交还页面。
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (modeRef.current === "static") return;
      let delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      if (event.deltaMode === 1) delta *= 40;
      else if (event.deltaMode === 2) delta *= el.clientWidth;
      if (!delta) return;
      if (modeRef.current === "clamp") {
        // 到边后放行，页面可以继续滚动。
        const max = Math.max(0, el.scrollWidth - el.clientWidth);
        const canContinue =
          delta > 0 ? el.scrollLeft < max - 1 : el.scrollLeft > 1;
        if (!canContinue) return;
      }
      event.preventDefault();
      targetRef.current += delta;
      startRaf();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // startRaf/applyScroll 等内部函数通过 ref 通信，闭包过期无副作用。
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

  // 拖拽期间误触的点击在捕获阶段拦截。
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
    if (modeRef.current === "static") return;
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
    // 内部函数通过 ref 通信，闭包过期无副作用。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointerDown]);

  const scrollable = mode !== "static";

  return (
    <div className="group relative">
      <div
        className="flex touch-pan-y select-none gap-2.5 overflow-x-auto pb-2 sm:gap-3 [&::-webkit-scrollbar]:hidden"
        ref={scrollerRef}
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={handlePointerDown}
      >
        <div className="flex shrink-0 gap-2.5 sm:gap-3" ref={copy1Ref}>
          {children}
        </div>
        <div
          aria-hidden="true"
          className="flex shrink-0 gap-2.5 sm:gap-3"
          ref={copy2Ref}
          style={mode === "loop" ? undefined : { display: "none" }}
        >
          {children}
        </div>
      </div>
      {scrollable && (
        <>
          <ArrowButton
            direction={-1}
            disabled={mode === "clamp" && !edges.left}
            onHoldEnd={stopHold}
            onHoldStart={handleHoldStart}
          />
          <ArrowButton
            direction={1}
            disabled={mode === "clamp" && !edges.right}
            onHoldEnd={stopHold}
            onHoldStart={handleHoldStart}
          />
        </>
      )}
    </div>
  );
}
