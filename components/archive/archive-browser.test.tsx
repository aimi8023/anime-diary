// @vitest-environment jsdom

import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Anime } from "@/lib/types";
import {
  DEFAULT_ARCHIVE_FILTERS,
  getArchiveStats,
} from "@/lib/archive/filter";
import ArchiveBrowser from "./archive-browser";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  search: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

vi.mock("@/components/timer", () => ({
  default: () => null,
}));

const records: Anime[] = [
  {
    id: "anime-1",
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
    id: "anime-2",
    title: "摇曳露营",
    season: "2024夏",
    cover: "",
    rating: 8.5,
    comment: "适合放松",
    episodes: 12,
    tags: ["日常", "治愈"],
    createdAt: "2024-08-01T00:00:00.000Z",
  },
  {
    id: "anime-3",
    title: "葬送的芙莉莲",
    season: "2025春",
    cover: "",
    rating: 9.5,
    comment: "时间与记忆",
    episodes: 28,
    tags: ["奇幻", "治愈"],
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

function renderArchive(
  initialFilters = DEFAULT_ARCHIVE_FILTERS,
) {
  return render(
    <ArchiveBrowser
      records={records}
      initialFilters={initialFilters}
      stats={getArchiveStats(records)}
    />,
  );
}

describe("ArchiveBrowser filtering", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    navigation.search = "";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders initial filters and the matching result count", () => {
    renderArchive({
      ...DEFAULT_ARCHIVE_FILTERS,
      year: "2024",
      tags: ["治愈"],
    });

    expect(screen.getByLabelText("年份")).toHaveValue("2024");
    expect(screen.getByRole("checkbox", { name: "治愈" })).toBeChecked();
    expect(screen.getByText("找到 1 部")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "移除年份 2024" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "移除标签 治愈" }),
    ).toBeInTheDocument();
  });

  it("combines filters and clears them without fetching", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderArchive();

    await user.selectOptions(screen.getByLabelText("年份"), "2024");
    await user.selectOptions(screen.getByLabelText("最低评分"), "9");
    expect(screen.getByText("找到 1 部")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "清除全部筛选" }),
    );
    expect(screen.getByText("找到 3 部")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("debounces keyword URL updates and replaces without scrolling", async () => {
    vi.useFakeTimers();
    renderArchive();
    navigation.replace.mockClear();

    fireEvent.change(screen.getByLabelText("关键词"), {
      target: { value: "音乐" },
    });
    expect(navigation.replace).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(navigation.replace).toHaveBeenLastCalledWith(
      "/?q=%E9%9F%B3%E4%B9%90",
      { scroll: false },
    );
    expect(screen.getByText("找到 1 部")).toBeInTheDocument();
  });

  it("opens and closes the mobile filter panel", async () => {
    const user = userEvent.setup();
    renderArchive();

    const filterButton = screen.getByRole("button", { name: "筛选" });
    expect(filterButton).toHaveAttribute("aria-expanded", "false");
    await user.click(filterButton);
    expect(filterButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("dialog", { name: "筛选条件" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "筛选条件" }).parentElement,
    ).toBe(document.body);

    await user.click(
      screen.getByRole("button", { name: "关闭筛选条件" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "筛选条件" }),
    ).not.toBeInTheDocument();
  });

  it("restores filters from the URL during browser history navigation", () => {
    renderArchive();

    window.history.replaceState(null, "", "/?year=2024");
    fireEvent.popState(window);

    expect(screen.getByLabelText("年份")).toHaveValue("2024");
    expect(screen.getByText("找到 2 部")).toBeInTheDocument();
  });
});
