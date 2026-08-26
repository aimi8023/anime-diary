// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScrollRow from "./scroll-row";

// 手动控制 requestAnimationFrame，保证动画帧可控且确定。
let rafQueue: FrameRequestCallback[] = [];

function installRaf() {
  rafQueue = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
}

function flushFrames(count: number, frameMs = 16.7) {
  let t = performance.now();
  for (let i = 0; i < count; i += 1) {
    t += frameMs;
    const queue = rafQueue;
    rafQueue = [];
    for (const cb of queue) cb(t);
  }
}

function makeChildren() {
  return ["A", "B", "C", "D"].map((item) => (
    <div className="w-[300px] shrink-0" key={item}>
      {item}
    </div>
  ));
}

interface RowHandle {
  scroller: HTMLElement;
  getScrollLeft: () => number;
}

// 覆盖布局属性后必须 rerender 一次触发重新测量：
// 挂载时的测量发生在 defineProperty 之前，读到的是 jsdom 默认值 0。
function renderRow(
  opts: { scrollWidth?: number; clientWidth?: number } = {},
): RowHandle {
  const utils = render(<ScrollRow>{makeChildren()}</ScrollRow>);
  const scroller = utils.container.querySelector(
    ".overflow-x-auto",
  ) as HTMLElement;
  let left = 0;
  Object.defineProperty(scroller, "scrollWidth", {
    value: opts.scrollWidth ?? 1500,
    configurable: true,
  });
  Object.defineProperty(scroller, "clientWidth", {
    value: opts.clientWidth ?? 400,
    configurable: true,
  });
  Object.defineProperty(scroller, "scrollLeft", {
    configurable: true,
    get: () => left,
    set: (value: number) => {
      left = value;
    },
  });
  utils.rerender(<ScrollRow>{makeChildren()}</ScrollRow>);
  return { scroller, getScrollLeft: () => left };
}

describe("ScrollRow", () => {
  beforeEach(() => {
    installRaf();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the row content in two copies for seamless looping", () => {
    renderRow();
    // 副本对读屏不可见但仍渲染，保证首尾相接。
    expect(screen.getAllByText("A")).toHaveLength(2);
    expect(screen.getAllByText("D")).toHaveLength(2);
  });

  it("shows both arrows whenever the row loops", () => {
    renderRow();
    expect(screen.getByRole("button", { name: "向左滚动" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "向右滚动" })).toBeEnabled();
  });

  it("hides arrows and the duplicate copy when content fits", () => {
    const { scroller } = renderRow({ scrollWidth: 700 });
    expect(
      screen.queryByRole("button", { name: "向右滚动" }),
    ).not.toBeInTheDocument();
    // 副本被隐藏而不是重复展示。
    const duplicate = scroller.children[1] as HTMLElement;
    expect(duplicate.getAttribute("aria-hidden")).toBe("true");
    expect(duplicate.style.display).toBe("none");
  });

  it("captures the wheel fully and glides to the target smoothly", () => {
    const { scroller, getScrollLeft } = renderRow();

    const notPrevented = fireEvent.wheel(scroller, { deltaY: 120 });
    // 滚轮事件被完全捕获：页面不随之滚动。
    expect(notPrevented).toBe(false);

    // 平滑趋近而不是瞬间跳变。
    flushFrames(1);
    const early = getScrollLeft();
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(120);

    flushFrames(80);
    expect(getScrollLeft()).toBe(120);
  });

  it("wraps scroll position seamlessly past the end of the row", () => {
    const { scroller, getScrollLeft } = renderRow();
    // 单份宽度 = 1500 / 2 = 750。
    for (let i = 0; i < 20; i += 1) {
      fireEvent.wheel(scroller, { deltaY: 120 });
    }
    flushFrames(120);
    // 总位移 2400，对 750 取模后落在 150。
    expect(getScrollLeft()).toBe(150);
  });

  it("scrolls backward across the loop seam to the tail cards", () => {
    const { scroller, getScrollLeft } = renderRow();
    for (let i = 0; i < 4; i += 1) {
      fireEvent.wheel(scroller, { deltaY: -120 });
    }
    flushFrames(120);
    // -480 mod 750 = 270。
    expect(getScrollLeft()).toBe(270);
  });

  it("glides a chunk on click and keeps gliding while the arrow is held", () => {
    const { getScrollLeft } = renderRow();
    const right = screen.getByRole("button", { name: "向右滚动" });

    fireEvent.pointerDown(right);
    flushFrames(80);
    // 单击步长 = max(400 * 0.75, 320) = 320。
    expect(getScrollLeft()).toBe(320);

    // 按住 300ms 后进入连续滚动。
    vi.useFakeTimers();
    fireEvent.pointerDown(right);
    // pointerDown 立即追加一段。
    flushFrames(80);
    const beforeHold = getScrollLeft();
    vi.advanceTimersByTime(400);
    flushFrames(60);
    expect(getScrollLeft()).toBeGreaterThan(beforeHold);

    // 松开后惯性滑完当前目标，然后完全停止。
    fireEvent.pointerUp(right);
    flushFrames(80);
    const settled = getScrollLeft();
    flushFrames(60);
    expect(getScrollLeft()).toBe(settled);
  });

  it("supports pointer dragging and suppresses card clicks after a drag", () => {
    const onSelect = vi.fn();
    const utils = render(
      <ScrollRow>
        <button onClick={onSelect} type="button">
          A
        </button>
      </ScrollRow>,
    );
    const scroller = utils.container.querySelector(
      ".overflow-x-auto",
    ) as HTMLElement;
    let left = 0;
    Object.defineProperty(scroller, "scrollWidth", {
      value: 1500,
      configurable: true,
    });
    Object.defineProperty(scroller, "clientWidth", {
      value: 400,
      configurable: true,
    });
    Object.defineProperty(scroller, "scrollLeft", {
      configurable: true,
      get: () => left,
      set: (value: number) => {
        left = value;
      },
    });
    utils.rerender(
      <ScrollRow>
        <button onClick={onSelect} type="button">
          A
        </button>
      </ScrollRow>,
    );

    // 未拖拽的普通点击正常生效。
    const card = scroller.querySelector("button") as HTMLButtonElement;
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);

    // 横向拖拽：内容 1:1 跟手移动。
    fireEvent.pointerDown(scroller, {
      button: 0,
      clientX: 300,
      clientY: 20,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(window, {
      clientX: 250,
      clientY: 20,
      pointerId: 1,
    });
    expect(left).toBe(50);
    fireEvent.pointerUp(window, { pointerId: 1 });

    // 拖拽后的点击被吞掉，不触发卡片。
    fireEvent.pointerDown(scroller, {
      button: 0,
      clientX: 300,
      clientY: 20,
      isPrimary: true,
      pointerId: 2,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(window, {
      clientX: 200,
      clientY: 20,
      pointerId: 2,
    });
    fireEvent.pointerUp(window, { pointerId: 2 });
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
