// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchiveSearchProvider } from "@/components/archive/archive-search-context";
import type { Anime } from "@/lib/types";

const { getAll } = vi.hoisted(() => ({
  getAll: vi.fn<() => Promise<Anime[]>>(),
}));

vi.mock("@/lib/storage-factory", () => ({
  storage: { getAll },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import HomePage from "./page";

const anime: Anime = {
  id: "anime-1",
  title: "孤独摇滚！",
  season: "2024夏",
  cover: "",
  rating: 9,
  comment: "很喜欢",
  episodes: 12,
  tags: ["音乐"],
  createdAt: "2024-07-01T00:00:00.000Z",
};

describe("HomePage", () => {
  beforeEach(() => {
    getAll.mockReset();
  });

  it("reads records once on the server and renders the archive immediately", async () => {
    getAll.mockResolvedValueOnce([anime]);

    render(
      <ArchiveSearchProvider>
        {await HomePage({
          searchParams: Promise.resolve({ year: "2024" }),
        })}
      </ArchiveSearchProvider>,
    );

    expect(getAll).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("heading", { name: "追番档案" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/个季度/)).toHaveTextContent("1 部");
    expect(screen.queryByText("加载中...")).not.toBeInTheDocument();
  });

  it("renders a distinct empty archive state", async () => {
    getAll.mockResolvedValueOnce([]);

    render(
      <ArchiveSearchProvider>
        {await HomePage({
          searchParams: Promise.resolve({}),
        })}
      </ArchiveSearchProvider>,
    );

    expect(screen.getByText("还没有建立追番档案")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a reloadable error instead of an empty archive", async () => {
    getAll.mockRejectedValueOnce(new Error("unavailable"));

    render(
      <ArchiveSearchProvider>
        {await HomePage({
          searchParams: Promise.resolve({}),
        })}
      </ArchiveSearchProvider>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "暂时无法读取追番记录",
    );
    expect(
      screen.getByRole("link", { name: "重新加载" }),
    ).toHaveAttribute("href", "/");
    expect(screen.queryByText("还没有建立追番档案")).not.toBeInTheDocument();
  });
});
