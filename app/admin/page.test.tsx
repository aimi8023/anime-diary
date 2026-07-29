// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import AdminPage from "./page";

const searchResult = {
  bangumiId: 352821,
  bangumiUrl: "https://bgm.tv/subject/352821",
  title: "孤独摇滚！",
  originalTitle: "ぼっち・ざ・ろっく！",
  cover: "https://lain.bgm.tv/cover.jpg",
  airDate: "2022-10-09",
  episodes: 12,
  alreadyAdded: false,
};

const prefill = {
  ...searchResult,
  season: "2022冬",
  suggestedTags: ["音乐", "青春"],
};

const existingAnime = {
  id: "anime-1",
  title: "葬送的芙莉莲",
  season: "2023秋",
  cover: "",
  rating: 9.5,
  comment: "时间与记忆",
  episodes: 28,
  tags: ["奇幻"],
  createdAt: "2026-01-01T00:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("AdminPage Bangumi entry", () => {
  it("opens on records and loads backups only after selecting that workspace", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async (input: string | URL | Request) => {
        const url = String(input);
        if (url === "/api/anime") return jsonResponse([existingAnime]);
        if (url === "/api/backups") {
          return jsonResponse({ backups: [] });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPage />);

    expect(
      await screen.findByRole("heading", { name: "记录管理" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "记录" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("葬送的芙莉莲")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/backups"),
    ).toBe(false);

    await user.click(screen.getByRole("tab", { name: "备份恢复" }));
    expect(
      await screen.findByRole("heading", { name: "备份与恢复" }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/backups"),
    ).toBe(true);
    expect(
      screen.queryByRole("heading", { name: "记录管理" }),
    ).not.toBeInTheDocument();
  });

  it("edits a record in the entry workspace and returns after cancelling", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        if (String(input) === "/api/anime") {
          return jsonResponse([existingAnime]);
        }
        throw new Error(`Unexpected fetch: ${String(input)}`);
      }),
    );

    render(<AdminPage />);
    expect(await screen.findByText("葬送的芙莉莲")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "编辑" }));
    expect(
      screen.getByRole("heading", { name: "编辑记录" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "添加记录" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByPlaceholderText("例如：葬送的芙莉莲"),
    ).toHaveValue("葬送的芙莉莲");

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(
      screen.getByRole("heading", { name: "记录管理" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "记录" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("searches, prefills, lets the administrator choose tags, and saves locally", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url === "/api/anime" && (!init?.method || init.method === "GET")) {
          return jsonResponse([]);
        }
        if (url === "/api/backups") {
          return jsonResponse({ backups: [] });
        }
        if (url.startsWith("/api/bangumi/search")) {
          return jsonResponse([searchResult]);
        }
        if (url === "/api/bangumi/subjects/352821") {
          return jsonResponse(prefill);
        }
        if (url === "/api/anime" && init?.method === "POST") {
          return jsonResponse({ id: "new-id" }, 201);
        }
        throw new Error(`Unexpected fetch: ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPage />);
    await user.click(
      await screen.findByRole("tab", { name: "添加记录" }),
    );

    expect(
      screen.getByRole("button", { name: "从 Bangumi 搜索" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "手动填写" }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("输入中文或日文标题"),
      "孤独摇滚{Enter}",
    );
    await user.click(
      await screen.findByRole("button", { name: "选择 孤独摇滚！" }),
    );

    expect(
      await screen.findByPlaceholderText("例如：葬送的芙莉莲"),
    ).toHaveValue("孤独摇滚！");
    expect(screen.getByText("资料来自 Bangumi")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "音乐" }));

    const form = screen
      .getByPlaceholderText("例如：葬送的芙莉莲")
      .closest("form");
    expect(form).not.toBeNull();
    await user.click(
      within(form as HTMLFormElement).getByRole("button", {
        name: "添加记录",
      }),
    );

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) => url === "/api/anime" && init?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(String(postCall?.[1]?.body));
      expect(body).toMatchObject({
        title: "孤独摇滚！",
        season: "2022冬",
        tags: ["音乐"],
        bangumiId: 352821,
        bangumiUrl: "https://bgm.tv/subject/352821",
        originalTitle: "ぼっち・ざ・ろっく！",
        airDate: "2022-10-09",
      });
    });
    expect(screen.getByRole("tab", { name: "记录" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
