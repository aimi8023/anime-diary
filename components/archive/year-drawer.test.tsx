// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Anime } from "@/lib/types";
import YearDrawer from "./year-drawer";

const records: Anime[] = [
  {
    id: "anime-1",
    title: "孤独摇滚！",
    season: "2024夏",
    cover: "",
    rating: 9,
    comment: "",
    episodes: 12,
    tags: ["音乐"],
    createdAt: "2024-07-01T00:00:00.000Z",
  },
  {
    id: "anime-2",
    title: "摇曳露营",
    season: "2024冬",
    cover: "",
    rating: 8.5,
    comment: "",
    episodes: 12,
    tags: ["日常"],
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "anime-3",
    title: "葬送的芙莉莲",
    season: "2025春",
    cover: "https://lain.bgm.tv/pic/cover/l/frieren.jpg",
    rating: 9.5,
    comment: "",
    episodes: 28,
    tags: ["奇幻"],
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

describe("YearDrawer", () => {
  it("renders nothing while closed", () => {
    render(
      <YearDrawer
        onClose={vi.fn()}
        onSelect={vi.fn()}
        open={false}
        records={records}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists years newest first with rating-ordered poster rows", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <YearDrawer
        onClose={onClose}
        onSelect={onSelect}
        open
        records={records}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "年度档案" });
    expect(dialog).toBeInTheDocument();

    const yearHeadings = screen.getAllByRole("heading", { name: /年$/ });
    expect(yearHeadings.map((heading) => heading.textContent)).toEqual([
      "2025 年",
      "2024 年",
    ]);

    // 2024 年行内按评分从高到低。
    const bon = screen.getByRole("button", { name: "查看《孤独摇滚！》详情" });
    const camp = screen.getByRole("button", { name: "查看《摇曳露营》详情" });
    expect(bon.compareDocumentPosition(camp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // 点击海报打开详情（抽屉由外层负责收起）。
    await user.click(bon);
    expect(onSelect).toHaveBeenCalledWith(records[0]);
  });

  it("closes from the close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <YearDrawer onClose={onClose} onSelect={vi.fn()} open records={records} />,
    );

    await user.click(screen.getByRole("button", { name: "关闭年度档案" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
