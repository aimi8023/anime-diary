// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScrollRow from "./scroll-row";

function renderRow() {
  const { container } = render(
    <ScrollRow>
      {["A", "B", "C", "D"].map((item) => (
        <div className="w-[300px] shrink-0" key={item}>
          {item}
        </div>
      ))}
    </ScrollRow>,
  );
  const scroller = container.querySelector(".overflow-x-auto") as HTMLElement;
  return { scroller };
}

function simulateOverflow(
  scroller: HTMLElement,
  scrollLeft: number,
  scrollWidth = 1200,
  clientWidth = 400,
) {
  Object.defineProperty(scroller, "scrollWidth", {
    value: scrollWidth,
    configurable: true,
  });
  Object.defineProperty(scroller, "clientWidth", {
    value: clientWidth,
    configurable: true,
  });
  Object.defineProperty(scroller, "scrollLeft", {
    value: scrollLeft,
    configurable: true,
  });
  fireEvent.scroll(scroller);
}

describe("ScrollRow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the row content", () => {
    renderRow();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("enables each arrow only while its direction has room", () => {
    const { scroller } = renderRow();
    simulateOverflow(scroller, 0);

    const left = screen.getByRole("button", { name: "向左滚动" });
    const right = screen.getByRole("button", { name: "向右滚动" });
    expect(left).toBeDisabled();
    expect(right).toBeEnabled();

    simulateOverflow(scroller, 800);
    expect(left).toBeEnabled();
    expect(right).toBeDisabled();
  });

  it("scrolls by a page on click and keeps scrolling while held", () => {
    vi.useFakeTimers();
    const { scroller } = renderRow();
    simulateOverflow(scroller, 0);
    const spy = vi.spyOn(scroller, "scrollBy");

    const right = screen.getByRole("button", { name: "向右滚动" });
    fireEvent.pointerDown(right);
    expect(spy).toHaveBeenCalledTimes(1);

    // 按住期间持续滚动。
    vi.advanceTimersByTime(1000);
    const duringHold = spy.mock.calls.length;
    expect(duringHold).toBeGreaterThan(2);

    // 松开后停止。
    fireEvent.pointerUp(right);
    const afterUp = spy.mock.calls.length;
    vi.advanceTimersByTime(500);
    expect(spy.mock.calls.length).toBe(afterUp);
  });
});
