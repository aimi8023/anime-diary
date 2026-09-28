// @vitest-environment jsdom

import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Anime } from "@/lib/types";
import {
  DEFAULT_ARCHIVE_FILTERS,
  getArchiveStats,
} from "@/lib/archive/filter";
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
    marks: ["rewatch"],
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
    marks: [],
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
    marks: ["rewatch", "source"],
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

  it("shows the search area inline on the page without opening anything", () => {
    renderArchive({ ...DEFAULT_ARCHIVE_FILTERS, year: "2024" });

    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByLabelText("搜索标题或感想")).toBeInTheDocument();
    expect(screen.getByLabelText("年份")).toHaveValue("2024");
    expect(screen.getByText("找到 2 部")).toBeInTheDocument();
    // 弹窗式搜索已移除：页面上不存在对话框，也不需要点击触发。
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "移除年份 2024" }),
    ).toBeInTheDocument();
  });

  it("filters as the user types without a search button or extra click", async () => {
    const user = userEvent.setup();
    renderArchive();
    expect(screen.getByText("找到 3 部")).toBeInTheDocument();

    await user.type(screen.getByLabelText("搜索标题或感想"), "芙莉莲");

    // 关键词经防抖写入筛选，无需点击任何搜索按钮。
    expect(await screen.findByText("找到 1 部")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "查看《葬送的芙莉莲》详情" }),
    ).toBeInTheDocument();
  });

  it("matches the original title and comment but no longer matches tags", async () => {
    const user = userEvent.setup();
    renderArchive();
    const input = screen.getByLabelText("搜索标题或感想");

    await user.type(input, "乐队");
    expect(await screen.findByText("找到 1 部")).toBeInTheDocument();

    // “奇幻”只存在于 anime-3 的标签里，标签已退出搜索范围。
    await user.clear(input);
    await user.type(input, "奇幻");
    expect(await screen.findByText("找到 0 部")).toBeInTheDocument();
  });

  it("clears the keyword with the inline clear button", async () => {
    const user = userEvent.setup();
    renderArchive();

    const input = screen.getByLabelText("搜索标题或感想");
    await user.type(input, "露营");
    expect(await screen.findByText("找到 1 部")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "清除关键词" }));

    expect(input).toHaveValue("");
    expect(await screen.findByText("找到 3 部")).toBeInTheDocument();
  });

  it("narrows by year and minimum rating, then clears everything", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderArchive();

    await user.selectOptions(screen.getByLabelText("年份"), "2024");
    await user.selectOptions(screen.getByLabelText("评分"), "9");
    expect(screen.getByText("找到 1 部")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "清除全部筛选" }),
    );
    expect(screen.getByText("找到 3 部")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("switches season with a one-click chip and restores 全部", async () => {
    const user = userEvent.setup();
    renderArchive();

    await user.click(screen.getByRole("button", { name: "1月" }));
    expect(screen.getByText("找到 1 部")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1月" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "移除季度 春" }),
    ).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("group", { name: "季度" })).getByRole("button", {
        name: "全部",
      }),
    );
    expect(screen.getByText("找到 3 部")).toBeInTheDocument();
  });

  it("debounces keyword URL updates through browser history without navigation", async () => {
    vi.useFakeTimers();
    renderArchive();
    replaceStateSpy.mockClear();

    fireEvent.change(screen.getByLabelText("搜索标题或感想"), {
      target: { value: "音乐" },
    });
    expect(replaceStateSpy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    // “音乐”只出现在标签里：标签已退出搜索范围，因此不再命中任何记录。
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, "", "/?q=%E9%9F%B3%E4%B9%90");
    expect(screen.getByText("找到 0 部")).toBeInTheDocument();

    // URL 已与筛选一致时不再重复写入。
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
  });

  it("narrows by mark chips and removes them one by one", async () => {
    const user = userEvent.setup();
    renderArchive();

    // 六个标记按钮常驻搜索区，与季度快切同排。
    const markGroup = screen.getByRole("group", { name: "标记" });
    await user.click(within(markGroup).getByRole("button", { name: "多刷" }));
    // 孤独摇滚与葬送的芙莉莲都带“多刷”。
    expect(screen.getByText("找到 2 部")).toBeInTheDocument();
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, "", "/?mark=rewatch");

    // 多选取交集：只有同时带“多刷”和“追原作”的芙莉莲留下。
    await user.click(
      within(markGroup).getByRole("button", { name: "追原作" }),
    );
    expect(screen.getByText("找到 1 部")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "查看《葬送的芙莉莲》详情" }),
    ).toBeInTheDocument();

    // 工具栏的标记 chip 可单独移除，不影响其他条件。
    await user.click(screen.getByRole("button", { name: "移除追原作" }));
    expect(screen.getByText("找到 2 部")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "移除追原作" }),
    ).not.toBeInTheDocument();
  });

  it("hides the sibling section for a single-entry work", async () => {
    const user = userEvent.setup();
    renderArchive({ ...DEFAULT_ARCHIVE_FILTERS, scope: "work" });

    await user.click(
      screen.getByRole("button", { name: "查看《葬送的芙莉莲》详情" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "葬送的芙莉莲" });
    expect(within(dialog).queryByText(/同作品 · 共/)).not.toBeInTheDocument();
  });

  it("switches the detail dialog to a sibling entry", async () => {
    const user = userEvent.setup();
    // 自建一个两条目的作品，避免改动共享夹具影响其他用例。
    const work: Anime[] = [
      {
        ...records[2],
        id: "w-1",
        title: "葬送的芙莉莲",
        season: "2023冬",
        series: "葬送的芙莉莲",
        marks: ["rewatch"],
      },
      {
        ...records[2],
        id: "w-2",
        title: "葬送的芙莉莲 第二季",
        season: "2026春",
        series: "葬送的芙莉莲",
        marks: ["sequel"],
      },
    ];
    render(
      <ArchiveBrowser
        records={work}
        initialFilters={{ ...DEFAULT_ARCHIVE_FILTERS, scope: "work" }}
        stats={getArchiveStats(work)}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "查看《葬送的芙莉莲》详情" }),
    );
    // 作品卡以最新条目为代表，所以先打开第二季。
    const dialog = await screen.findByRole("dialog", {
      name: "葬送的芙莉莲 第二季",
    });

    // 作品详情列出全部条目，计数含当前这条。
    expect(within(dialog).getByText("同作品 · 共 2 个条目")).toBeInTheDocument();
    // 标记按作品并集展示：第一季的「多刷」在这一部作品上也生效。
    expect(within(dialog).getByText("多刷")).toBeInTheDocument();
    expect(within(dialog).getByText("等续作")).toBeInTheDocument();

    // 切到同作品的第一季。
    await user.click(
      within(dialog).getByRole("button", { name: /2023年10月/ }),
    );

    expect(
      await screen.findByRole("dialog", { name: "葬送的芙莉莲" }),
    ).toBeInTheDocument();
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
