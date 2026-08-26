// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { YearRecap } from "@/lib/archive/types";
import YearRecapPanel from "./year-recap";

const recaps: YearRecap[] = [
  {
    year: "2024",
    total: 12,
    averageRating: 8.6,
    topAnime: { title: "孤独摇滚！", rating: 9 },
    topTags: ["日常", "音乐"],
  },
];

describe("YearRecapPanel", () => {
  it("stays hidden until expanded and applies the year filter on click", async () => {
    const user = userEvent.setup();
    const onSelectYear = vi.fn();
    render(<YearRecapPanel recaps={recaps} onSelectYear={onSelectYear} />);

    expect(screen.queryByText("2024 年")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /年度回顾/ }));
    expect(screen.getByText("孤独摇滚！")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "筛选 2024 年的 12 部记录" }),
    );
    expect(onSelectYear).toHaveBeenCalledWith("2024");
  });

  it("renders nothing without recap data", () => {
    render(<YearRecapPanel recaps={[]} onSelectYear={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
