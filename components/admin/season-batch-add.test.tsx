// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SeasonBatchAdd from "./season-batch-add";

const candidates = [
  {
    bangumiId: 1,
    bangumiUrl: "https://bgm.tv/subject/1",
    title: "新番甲",
    originalTitle: "新番甲",
    cover: "",
    airDate: "2024-04-10",
    episodes: 12,
    alreadyAdded: false,
  },
  {
    bangumiId: 2,
    bangumiUrl: "https://bgm.tv/subject/2",
    title: "新番乙",
    originalTitle: "新番乙",
    cover: "",
    airDate: "2024-05-01",
    episodes: 13,
    alreadyAdded: false,
  },
  {
    bangumiId: 3,
    bangumiUrl: "https://bgm.tv/subject/3",
    title: "已收录番",
    originalTitle: "已收录番",
    cover: "",
    airDate: "2024-04-02",
    episodes: 24,
    alreadyAdded: true,
    localAnimeId: "local-3",
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SeasonBatchAdd", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function setupFetch(postStatusFor: Record<number, number> = {}) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/bangumi/season")) {
        return jsonResponse(candidates);
      }
      if (url.endsWith("/api/anime") && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { bangumiId: number };
        const status = postStatusFor[body.bangumiId] ?? 201;
        return jsonResponse({ id: `created-${body.bangumiId}` }, status);
      }
      return jsonResponse({ error: "unexpected" }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("fetches the season list and marks already-added entries", async () => {
    const user = userEvent.setup();
    setupFetch();

    render(<SeasonBatchAdd onCreated={vi.fn()} onGoToUnrated={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "获取季度列表" }));

    expect(await screen.findByText("新番甲")).toBeInTheDocument();
    expect(screen.getByText("已收录")).toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(3);
    expect(boxes[2]).toBeDisabled();
  });

  it("creates selected records with rating 0 and reports duplicates", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const fetchMock = setupFetch({ 2: 409 });

    render(<SeasonBatchAdd onCreated={onCreated} onGoToUnrated={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "获取季度列表" }));
    await screen.findByText("新番甲");

    const boxes = screen.getAllByRole("checkbox");
    await user.click(boxes[0]);
    await user.click(boxes[1]);

    await user.click(screen.getByRole("button", { name: "入库所选 2 部" }));

    await waitFor(() => {
      expect(
        screen.getByText(/新增 1 部，跳过重复 1 部，失败 0 部/),
      ).toBeInTheDocument();
    });

    const posts = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );
    expect(posts).toHaveLength(2);
    const firstBody = JSON.parse(
      String((posts[0][1] as RequestInit).body),
    ) as Record<string, unknown>;
    expect(firstBody).toMatchObject({
      rating: 0,
      season: "2024夏",
      bangumiId: 1,
      tags: [],
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it("navigates to the unrated records view after a successful batch", async () => {
    const user = userEvent.setup();
    const onGoToUnrated = vi.fn();
    setupFetch();

    render(<SeasonBatchAdd onCreated={vi.fn()} onGoToUnrated={onGoToUnrated} />);
    await user.click(screen.getByRole("button", { name: "获取季度列表" }));
    await user.click(await screen.findByText("新番甲"));
    await user.click(screen.getByRole("button", { name: "入库所选 1 部" }));

    const goButton = await screen.findByRole("button", {
      name: "前往记录补评分",
    });
    await user.click(goButton);
    expect(onGoToUnrated).toHaveBeenCalled();
  });
});
