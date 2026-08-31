// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import BangumiSearch from "./bangumi-search";

const searchResult = {
  bangumiId: 352821,
  bangumiUrl: "https://bgm.tv/subject/352821",
  title: "孤独摇滚！",
  originalTitle: "ぼっち・ざ・ろっく！",
  cover: "https://lain.bgm.tv/cover.jpg",
  coverThumb: "https://lain.bgm.tv/cover-thumb.jpg",
  airDate: "2022-10-09",
  episodes: 12,
  alreadyAdded: false,
};

const prefill = {
  ...searchResult,
  season: "2022冬",
  suggestedTags: ["音乐", "青春"],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderSearch(overrides = {}) {
  const props = {
    onSelect: vi.fn(),
    onEditExisting: vi.fn(),
    onUseManual: vi.fn(),
    ...overrides,
  };
  render(<BangumiSearch {...props} />);
  return props;
}

afterEach(() => vi.unstubAllGlobals());

describe("BangumiSearch", () => {
  it("validates a blank keyword without requesting the API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderSearch();

    await user.click(screen.getByRole("button", { name: "搜索" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "请输入要搜索的番剧名称",
    );
  });

  it("searches on Enter and selects a detail prefill", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([searchResult]))
      .mockResolvedValueOnce(jsonResponse(prefill));
    vi.stubGlobal("fetch", fetchMock);
    const props = renderSearch();

    await user.type(
      screen.getByPlaceholderText("输入中文或日文标题"),
      " 孤独摇滚 {Enter}",
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/bangumi/search?q=%E5%AD%A4%E7%8B%AC%E6%91%87%E6%BB%9A",
    );
    expect(screen.getByText("ぼっち・ざ・ろっく！")).toBeInTheDocument();
    expect(screen.getByText("2022-10-09 · 12 话")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "选择 孤独摇滚！" }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/bangumi/subjects/352821",
    );
    expect(props.onSelect).toHaveBeenCalledWith(prefill);
  });

  it("opens an already stored local record without fetching details", async () => {
    const user = userEvent.setup();
    const existing = {
      ...searchResult,
      alreadyAdded: true,
      localAnimeId: "local-id",
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([existing]));
    vi.stubGlobal("fetch", fetchMock);
    const props = renderSearch();

    await user.type(
      screen.getByPlaceholderText("输入中文或日文标题"),
      "孤独摇滚{Enter}",
    );
    await user.click(
      screen.getByRole("button", { name: "编辑已收录的 孤独摇滚！" }),
    );

    expect(props.onEditExisting).toHaveBeenCalledWith("local-id");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows an upstream error and keeps manual entry available", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: "Bangumi 服务暂时不可用" }, 502),
      ),
    );
    const props = renderSearch();

    await user.type(
      screen.getByPlaceholderText("输入中文或日文标题"),
      "孤独摇滚{Enter}",
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Bangumi 服务暂时不可用",
    );
    await user.click(screen.getByRole("button", { name: "改为手动填写" }));
    expect(props.onUseManual).toHaveBeenCalledOnce();
  });

  it("prevents a second request while search is pending", async () => {
    const user = userEvent.setup();
    let resolveSearch!: (response: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolveSearch = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("fetch", fetchMock);
    renderSearch();

    await user.type(
      screen.getByPlaceholderText("输入中文或日文标题"),
      "孤独摇滚",
    );
    const button = screen.getByRole("button", { name: "搜索" });
    await user.click(button);

    expect(screen.getByRole("button", { name: "搜索中..." })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "搜索中..." }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveSearch(jsonResponse([]));
    expect(await screen.findByText("没有找到匹配的动画条目")).toBeInTheDocument();
  });
});
