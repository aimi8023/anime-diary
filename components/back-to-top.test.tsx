// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BackToTop from "./back-to-top";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    value,
    configurable: true,
  });
  fireEvent.scroll(window);
}

describe("BackToTop", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setScrollY(0);
  });

  it("appears after scrolling past a threshold and scrolls back on click", () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;
    render(<BackToTop />);

    expect(screen.queryByRole("button", { name: "返回顶部" })).toBeNull();

    setScrollY(800);
    const button = screen.getByRole("button", { name: "返回顶部" });
    expect(button).not.toHaveClass("pointer-events-none");

    fireEvent.click(button);
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0, behavior: "smooth" }),
    );

    setScrollY(0);
    // 隐藏态带 aria-hidden，无障碍名称为空，改按标签属性查询。
    expect(screen.getByLabelText("返回顶部")).toHaveClass(
      "pointer-events-none",
    );
  });
});
