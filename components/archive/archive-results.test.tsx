// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Anime } from "@/lib/types";
import ArchiveResults from "./archive-results";

const records: Anime[] = [
  {
    id: "anime-2024",
    title: "孤独摇滚！",
    season: "2024夏",
    cover: "",
    rating: 9,
    comment: "乐队成长",
    episodes: 12,
    tags: ["音乐", "日常"],
    createdAt: "2024-07-01T00:00:00.000Z",
  },
  {
    id: "anime-2025",
    title: "葬送的芙莉莲",
    season: "2025春",
    cover: "https://lain.bgm.tv/pic/cover/l/frieren.jpg",
    rating: 9.5,
    comment: "时间与记忆",
    episodes: 28,
    tags: ["奇幻", "治愈"],
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

describe("ArchiveResults", () => {
  it("loads the first visible poster eagerly for the page LCP", () => {
    const { container } = render(
      <ArchiveResults
        onClearFilters={vi.fn()}
        onSelect={vi.fn()}
        records={records}
        sort="rating"
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "loading",
      "eager",
    );
  });

  it("renders years newest first and keeps only the newest open initially", () => {
    render(
      <ArchiveResults
        onClearFilters={vi.fn()}
        onSelect={vi.fn()}
        records={records}
        sort="rating"
      />,
    );

    const yearButtons = screen.getAllByRole("button", {
      name: /20\d{2} 年/,
    });
    expect(
      yearButtons.map((button) => button.getAttribute("aria-label")),
    ).toEqual([
      "2025 年",
      "2024 年",
    ]);
    expect(yearButtons[0]).toHaveAttribute("aria-expanded", "true");
    expect(yearButtons[1]).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: "查看《葬送的芙莉莲》详情" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "查看《孤独摇滚！》详情" }),
    ).not.toBeInTheDocument();
  });

  it("allows an older year and its season to expand and selects a card", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ArchiveResults
        onClearFilters={vi.fn()}
        onSelect={onSelect}
        records={records}
        sort="rating"
      />,
    );

    await user.click(screen.getByRole("button", { name: "2024 年" }));
    expect(
      screen.getByRole("button", { name: "2024 年" }),
    ).toHaveAttribute("aria-expanded", "true");

    const seasonButton = screen.getByRole("button", { name: "2024夏" });
    expect(seasonButton).toHaveAttribute("aria-expanded", "true");
    await user.click(seasonButton);
    expect(seasonButton).toHaveAttribute("aria-expanded", "false");
    await user.click(seasonButton);

    await user.click(
      screen.getByRole("button", { name: "查看《孤独摇滚！》详情" }),
    );
    expect(onSelect).toHaveBeenCalledWith(records[0]);
  });

  it("keeps an older year usable when a legacy record has nullable tags", async () => {
    const user = userEvent.setup();
    const legacyRecord = {
      ...records[0],
      tags: null,
    } as unknown as Anime;

    render(
      <ArchiveResults
        onClearFilters={vi.fn()}
        onSelect={vi.fn()}
        records={[records[1], legacyRecord]}
        sort="rating"
      />,
    );

    await user.click(screen.getByRole("button", { name: "2024 年" }));

    expect(
      screen.getByRole("button", { name: "查看《孤独摇滚！》详情" }),
    ).toBeInTheDocument();
  });

  it("renders a recoverable no-result state", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(
      <ArchiveResults
        onClearFilters={onClearFilters}
        onSelect={vi.fn()}
        records={[]}
        sort="rating"
      />,
    );

    expect(screen.getByText("没有匹配的记录")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it("opens the first remaining year after filtering removes newer years", () => {
    const { rerender } = render(
      <ArchiveResults
        onClearFilters={vi.fn()}
        onSelect={vi.fn()}
        records={records}
        sort="rating"
      />,
    );

    expect(
      screen.getByRole("button", { name: "2024 年" }),
    ).toHaveAttribute("aria-expanded", "false");

    rerender(
      <ArchiveResults
        onClearFilters={vi.fn()}
        onSelect={vi.fn()}
        records={[records[0]]}
        sort="rating"
      />,
    );

    expect(
      screen.getByRole("button", { name: "2024 年" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
