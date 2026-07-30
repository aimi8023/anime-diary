// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
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
});
