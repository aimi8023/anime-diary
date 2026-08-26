// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Anime } from "@/lib/types";
import type { ArchiveFilters } from "@/lib/archive/types";
import { DEFAULT_ARCHIVE_FILTERS } from "@/lib/archive/filter";
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

function renderResults(
  overrides: {
    filters?: Partial<ArchiveFilters>;
    records?: Anime[];
    onSelect?: (anime: Anime) => void;
  } = {},
) {
  const onSelect = overrides.onSelect ?? vi.fn();
  const { container } = render(
    <ArchiveResults
      filters={{ ...DEFAULT_ARCHIVE_FILTERS, ...overrides.filters }}
      onClearFilters={vi.fn()}
      onSelect={onSelect}
      records={overrides.records ?? records}
    />,
  );
  return { container, onSelect };
}

describe("ArchiveResults", () => {
  it("renders one horizontal poster row per year in the year dimension", () => {
    const { container } = renderResults();

    expect(screen.getByRole("heading", { name: "2025 年" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2024 年" })).toBeInTheDocument();
    expect(screen.getByText("葬送的芙莉莲")).toBeInTheDocument();
    expect(screen.getByText("孤独摇滚！")).toBeInTheDocument();

    // 卡片行：横向滚动 + 紧凑卡片。
    const row = container.querySelector("div.overflow-x-auto");
    expect(row).not.toBeNull();
    expect(row?.firstElementChild).toHaveClass("w-[104px]");
  });

  it("groups by rating buckets without year dividers", () => {
    renderResults({ filters: { group: "rating" } });

    expect(screen.getByRole("heading", { name: "★ 9.5" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "★ 9.0" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /年$/ })).not.toBeInTheDocument();
  });

  it("reverses group order in ascending direction", () => {
    renderResults({
      filters: { group: "year", direction: "asc" },
    });

    const headings = screen.getAllByRole("heading", { name: /年$/ });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "2024 年",
      "2025 年",
    ]);
  });

  it("renders a flat grid without section headers in the time dimension", () => {
    renderResults({ filters: { group: "time" } });

    expect(screen.getByText("葬送的芙莉莲")).toBeInTheDocument();
    expect(screen.getByText("孤独摇滚！")).toBeInTheDocument();
    // 卡片标题是 h4；分组标题（h3）不应存在。
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("opens detail dialogs from row cards", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderResults();

    await user.click(
      screen.getByRole("button", { name: "查看《孤独摇滚！》详情" }),
    );
    expect(onSelect).toHaveBeenCalledWith(records[0]);
  });

  it("keeps legacy records with nullable tags renderable", () => {
    const legacyRecord = {
      ...records[0],
      tags: null,
    } as unknown as Anime;

    renderResults({ records: [records[1], legacyRecord] });

    expect(screen.getByText("孤独摇滚！")).toBeInTheDocument();
  });

  it("renders a recoverable no-result state", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(
      <ArchiveResults
        filters={DEFAULT_ARCHIVE_FILTERS}
        onClearFilters={onClearFilters}
        onSelect={vi.fn()}
        records={[]}
      />,
    );

    expect(screen.getByText("没有匹配的记录")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });
});
