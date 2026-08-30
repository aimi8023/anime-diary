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

describe("AdminPage unrated workflow", () => {
  const candidate = {
    bangumiId: 999,
    bangumiUrl: "https://bgm.tv/subject/999",
    title: "新番甲",
    originalTitle: "新番甲",
    cover: "",
    airDate: "2024-04-10",
    episodes: 12,
    alreadyAdded: false,
  };

  function setup() {
    let records: Array<Record<string, unknown>> = [
      { ...existingAnime },
    ];
    const fetchMock = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (url === "/api/anime" && method === "GET") {
          return jsonResponse(records);
        }
        if (url.includes("/api/bangumi/season")) {
          return jsonResponse([candidate]);
        }
        if (url === "/api/anime" && method === "POST") {
          const body = JSON.parse(String(init?.body)) as Record<
            string,
            unknown
          >;
          records = [
            ...records,
            { ...body, id: "anime-999", createdAt: "2026-08-30T00:00:00.000Z" },
          ];
          return jsonResponse({ id: "anime-999" }, 201);
        }
        if (url.startsWith("/api/anime/") && method === "PUT") {
          const body = JSON.parse(String(init?.body)) as Record<
            string,
            unknown
          >;
          records = records.map((record) => ({ ...record, ...body }));
          return jsonResponse({ id: "anime-999" });
        }
        throw new Error(`Unexpected fetch: ${method} ${url}`);
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("batch-adds an unrated record and rates it later from the records workspace", async () => {
    const user = userEvent.setup();
    setup();

    render(<AdminPage />);
    expect(await screen.findByText("葬送的芙莉莲")).toBeInTheDocument();

    // 季度批量入库。
    await user.click(screen.getByRole("button", { name: "+ 添加番剧" }));
    await user.click(screen.getByRole("button", { name: "季度批量" }));
    await user.click(screen.getByRole("button", { name: "获取季度列表" }));
    await user.click(await screen.findByText("新番甲"));
    await user.click(screen.getByRole("button", { name: "入库所选 1 部" }));
    await screen.findByText(/新增 1 部，跳过重复 0 部，失败 0 部/);

    // 跳转到记录工作区并激活未评分过滤。
    await user.click(screen.getByRole("button", { name: "前往记录补评分" }));
    const chip = screen.getByRole("button", { name: "只看未评分 1" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    const row = await screen.findByLabelText("补评分《新番甲》");

    // 快速补评分。
    await user.click(row);
    const dialog = screen.getByRole("dialog", { name: "补评分《新番甲》" });
    await user.click(within(dialog).getByRole("button", { name: "8 分" }));
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("补评分《新番甲》")).toBeNull();
    });
  });
});

describe("AdminPage Bangumi entry", () => {
  it("asks for confirmation before discarding unsaved form edits", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url === "/api/anime") return jsonResponse([existingAnime]);
        if (url === "/api/backups") return jsonResponse({ backups: [] });
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    render(<AdminPage />);
    expect(await screen.findByText("葬送的芙莉莲")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ 添加番剧" }));
    await user.click(screen.getByRole("button", { name: "手动填写" }));
    await user.type(screen.getByLabelText("标题 *"), "未保存的新记录");

    // 直接切换工作区会被确认对话框拦截。
    await user.click(screen.getByRole("tab", { name: "备份恢复" }));
    const dialog = screen.getByRole("dialog", {
      name: "放弃未保存的修改？",
    });
    expect(dialog).toBeInTheDocument();

    // 取消则停留在原工作区。
    await user.click(
      within(dialog).getByRole("button", { name: "取消" }),
    );
    expect(
      screen.getByLabelText("标题 *"),
    ).toBeInTheDocument();

    // 确认后才真正离开。
    await user.click(screen.getByRole("tab", { name: "备份恢复" }));
    await user.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(
      await screen.findByRole("heading", { name: "备份与恢复" }),
    ).toBeInTheDocument();
  });

  it("shows a safe inline error when the record list cannot load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<h1>Gateway Error</h1>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );

    render(<AdminPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "读取记录失败",
    );
  });

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

    await user.click(
      screen.getByRole("button", { name: "编辑《葬送的芙莉莲》" }),
    );
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

  it("shows delete failures inline without opening a blocking alert", async () => {
    const user = userEvent.setup();
    const alertSpy = vi
      .spyOn(window, "alert")
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (
          input: string | URL | Request,
          init?: RequestInit,
        ) => {
          const url = String(input);
          if (url === "/api/anime" && init?.method === "DELETE") {
            return jsonResponse(
              { error: "存储暂时不可用" },
              500,
            );
          }
          if (url === "/api/anime") {
            return jsonResponse([existingAnime]);
          }
          if (
            url === `/api/anime/${existingAnime.id}` &&
            init?.method === "DELETE"
          ) {
            return jsonResponse(
              { error: "存储暂时不可用" },
              500,
            );
          }
          throw new Error(`Unexpected fetch: ${url}`);
        },
      ),
    );

    render(<AdminPage />);
    expect(await screen.findByText("葬送的芙莉莲")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "删除《葬送的芙莉莲》" }),
    );

    const dialog = screen.getByRole("dialog", { name: "删除《葬送的芙莉莲》？" });
    expect(dialog).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "确认删除" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "存储暂时不可用",
    );
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
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
