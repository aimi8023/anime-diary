// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RunningTimer from "./running-timer";

describe("RunningTimer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows days, hours, minutes and seconds and keeps ticking", async () => {
    vi.useFakeTimers();
    render(<RunningTimer />);

    const timer = screen.getByRole("timer");
    expect(timer).toHaveTextContent("已运行");
    expect(timer).toHaveTextContent("天");
    expect(timer).toHaveTextContent("时");
    expect(timer).toHaveTextContent("分");
    expect(timer).toHaveTextContent("秒");
    expect(timer).toHaveAccessibleName(/本站已运行 \d+ 天 \d+ 小时 \d+ 分 \d+ 秒/);

    const secondsBefore = screen.getByText("秒").previousElementSibling
      ?.textContent;
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    const secondsAfter = screen.getByText("秒").previousElementSibling
      ?.textContent;

    expect(secondsAfter).not.toEqual(secondsBefore);
  });
});
