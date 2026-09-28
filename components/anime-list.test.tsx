// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AnimeList from "./anime-list";

const anime = {
  id: "anime-1",
  title: "葬送的芙莉莲",
  season: "2023秋",
  cover: "https://lain.bgm.tv/pic/cover/l/example.jpg",
  rating: 9.5,
  comment: "时间与记忆",
  episodes: 28,
  tags: ["奇幻"],
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("AnimeList", () => {
  it("uses the page scroll instead of a fixed internal scroll area", () => {
    const { container } = render(
      <AnimeList
        animeList={[anime]}
        deleting={null}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText("葬送的芙莉莲")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "葬送的芙莉莲封面" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "编辑《葬送的芙莉莲》" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "删除《葬送的芙莉莲》" }),
    ).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveClass("max-h-[500px]");
    expect(container.firstElementChild).not.toHaveClass("overflow-y-auto");
  });

  it("points an empty workspace to the add-record action", () => {
    render(
      <AnimeList
        animeList={[]}
        deleting={null}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText("还没有添加任何番剧，点击添加记录开始吧"))
      .toBeInTheDocument();
  });

  it("offers the quick action to rated records so marks need no full edit", async () => {
    const user = userEvent.setup();
    const onQuickRate = vi.fn();
    render(
      <AnimeList
        animeList={[anime]}
        deleting={null}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onQuickRate={onQuickRate}
      />,
    );

    const quickButton = screen.getByRole("button", {
      name: "打标记《葬送的芙莉莲》",
    });
    expect(
      screen.queryByRole("button", { name: "补评分《葬送的芙莉莲》" }),
    ).not.toBeInTheDocument();

    await user.click(quickButton);
    expect(onQuickRate).toHaveBeenCalledWith(anime);
  });

  it("keeps the补评分 label for unrated records and shows existing marks", () => {
    render(
      <AnimeList
        animeList={[
          { ...anime, id: "a2", title: "未评分番", rating: 0, marks: [] },
          { ...anime, id: "a3", title: "已标记番", marks: ["rewatch", "source"] },
        ]}
        deleting={null}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onQuickRate={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "补评分《未评分番》" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "打标记《已标记番》" }),
    ).toBeInTheDocument();
    // 列表行直接回显已有标记，便于逐条核对进度。
    expect(screen.getByText("多刷")).toBeInTheDocument();
    expect(screen.getByText("看过原作")).toBeInTheDocument();
  });
});
