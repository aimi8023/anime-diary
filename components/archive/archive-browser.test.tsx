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
import {
  ArchiveSearchProvider,
  useArchiveSearch,
} from "./archive-search-context";
import ArchiveBrowser from "./archive-browser";

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
    <ArchiveSearchProvider>
      <SearchLauncher />
      <ArchiveBrowser
        records={records}
        initialFilters={initialFilters}
        stats={getArchiveStats(records)}
      />
    </ArchiveSearchProvider>,
  );
}

function SearchLauncher() {
  const { openSearch } = useArchiveSearch();
  return (
    <button onClick={openSearch} type="button">
      打开搜索
    </button>
  );
}

describe("ArchiveBrowser filtering", () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    replaceStateSpy = vi.spyOn(window.history, "replaceState");
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.style.overflow = "";
    replaceStateSpy.mockRestore();
  });

  it("keeps the search form hidden until the launcher opens it", async () => {
    const user = userEvent.setup();
    renderArchive({
      ...DEFAULT_ARCHIVE_FILTERS,
      year: "2024",
      tags: ["治愈"],
    });

    expect(
      screen.queryByRole("dialog", { name: "搜索与筛选" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("找到 1 部")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "打开搜索" }));

    expect(
      screen.getByRole("dialog", { name: "搜索与筛选" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("年份")).toHaveValue("2024");
    expect(screen.getByLabelText("关键词")).toHaveFocus();
    expect(screen.getByRole("checkbox", { name: "治愈" })).toBeChecked();
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
    await user.click(screen.getByRole("button", { name: "打开搜索" }));

    await user.selectOptions(screen.getByLabelText("年份"), "2024");
    await user.selectOptions(screen.getByLabelText("最低评分"), "9");
    expect(screen.getByText("找到 1 部")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "清除全部筛选" }),
    );
    expect(screen.getByText("找到 3 部")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("debounces keyword URL updates through browser history without navigation", async () => {
    vi.useFakeTimers();
    renderArchive();
    replaceStateSpy.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "打开搜索" }));

    fireEvent.change(screen.getByLabelText("关键词"), {
      target: { value: "音乐" },
    });
    expect(replaceStateSpy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      "/?q=%E9%9F%B3%E4%B9%90",
    );
    expect(screen.getByText("找到 1 部")).toBeInTheDocument();

    // URL 已与筛选一致时不再重复写入。
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
  });

  it("closes the search panel with Escape and restores focus", async () => {
    const user = userEvent.setup();
    renderArchive();

    const launcher = screen.getByRole("button", { name: "打开搜索" });
    await user.click(launcher);
    expect(screen.getByRole("dialog").parentElement).toBe(document.body);

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "搜索与筛选" }),
    ).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();
  });

  it("closes from the backdrop but keeps selected filters when reopened", async () => {
    const user = userEvent.setup();
    renderArchive();

    const launcher = screen.getByRole("button", { name: "打开搜索" });
    await user.click(launcher);
    await user.selectOptions(screen.getByLabelText("年份"), "2024");
    fireEvent.click(
      screen.getByRole("dialog", { name: "搜索与筛选" }),
    );

    expect(
      screen.queryByRole("dialog", { name: "搜索与筛选" }),
    ).not.toBeInTheDocument();

    await user.click(launcher);
    expect(screen.getByLabelText("年份")).toHaveValue("2024");
  });

  it("locks background scrolling until the close button is used", async () => {
    const user = userEvent.setup();
    document.body.style.overflow = "clip";
    renderArchive();

    await user.click(screen.getByRole("button", { name: "打开搜索" }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(
      screen.getByRole("button", { name: "关闭搜索与筛选" }),
    );
    expect(document.body.style.overflow).toBe("clip");
  });

  it("restores filters from the URL during browser history navigation", () => {
    renderArchive();

    window.history.replaceState(null, "", "/?year=2024");
    fireEvent.popState(window);

    expect(
      screen.getByRole("button", { name: "移除年份 2024" }),
    ).toBeInTheDocument();
    expect(screen.getByText("找到 2 部")).toBeInTheDocument();
  });

  it("steps through filtered records inside the detail dialog", async () => {
    const user = userEvent.setup();
    renderArchive();

    await user.click(
      screen.getByRole("button", { name: "查看《葬送的芙莉莲》详情" }),
    );
    expect(
      screen.getByRole("dialog", { name: "葬送的芙莉莲" }),
    ).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");

    // 按评分排序：芙莉莲 9.5 → 孤独摇滚 9。
    expect(
      screen.getByRole("dialog", { name: "孤独摇滚！" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("opens the linked record directly from an ?anime deep link", async () => {
    window.history.replaceState(null, "", "/?anime=anime-2");
    renderArchive();

    expect(
      await screen.findByRole("dialog", { name: "摇曳露营" }),
    ).toBeInTheDocument();
  });

  it("shows the live result count inside the search panel", async () => {
    const user = userEvent.setup();
    renderArchive();

    await user.click(screen.getByRole("button", { name: "打开搜索" }));
    const panel = screen.getByRole("dialog", { name: "搜索与筛选" });

    expect(panel).toHaveTextContent("当前条件：找到 3 部");

    await user.selectOptions(screen.getByLabelText("年份"), "2024");

    expect(panel).toHaveTextContent("当前条件：找到 2 部");
  });

  it("switches grouping and direction from the toolbar", async () => {
    const user = userEvent.setup();
    renderArchive();
    replaceStateSpy.mockClear();

    const ratingButton = screen.getByRole("button", { name: "评分" });
    expect(ratingButton).toHaveAttribute("aria-pressed", "false");

    await user.click(ratingButton);
    expect(ratingButton).toHaveAttribute("aria-pressed", "true");
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      "/?group=rating",
    );

    await user.click(screen.getByRole("button", { name: "改为升序排列" }));
    expect(replaceStateSpy).toHaveBeenLastCalledWith(
      null,
      "",
      "/?group=rating&dir=asc",
    );
  });
});
