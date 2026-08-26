import { beforeEach, describe, expect, it, vi } from "vitest";
import { BangumiClientError } from "@/lib/bangumi/client";

const clientMock = vi.hoisted(() => ({
  searchBangumiSubjects: vi.fn(),
}));
const storageMock = vi.hoisted(() => ({
  getState: vi.fn(),
}));

vi.mock("@/lib/bangumi/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bangumi/client")>();
  return { ...actual, searchBangumiSubjects: clientMock.searchBangumiSubjects };
});
vi.mock("@/lib/storage-factory", () => ({ storage: storageMock }));

import { GET } from "./route";

const result = {
  bangumiId: 352821,
  bangumiUrl: "https://bgm.tv/subject/352821",
  title: "孤独摇滚！",
  originalTitle: "ぼっち・ざ・ろっく！",
  cover: "https://lain.bgm.tv/large.jpg",
  airDate: "2022-10-09",
  episodes: 12,
};

function request(query: string): Request {
  return new Request(`http://localhost/api/bangumi/search${query}`);
}

describe("GET /api/bangumi/search", () => {
  beforeEach(() => {
    clientMock.searchBangumiSubjects.mockReset();
    storageMock.getState.mockReset();
  });

  it.each(["", "?q=", "?q=%20%20"])(
    "rejects a missing query: %s",
    async (query) => {
      const response = await GET(request(query));
      expect(response.status).toBe(400);
      expect(clientMock.searchBangumiSubjects).not.toHaveBeenCalled();
    },
  );

  it("rejects a query longer than 100 characters", async () => {
    const response = await GET(request(`?q=${"a".repeat(101)}`));
    expect(response.status).toBe(400);
  });

  it("trims the query and decorates exact local duplicates with one state read", async () => {
    clientMock.searchBangumiSubjects.mockResolvedValue([
      result,
      { ...result, bangumiId: 999, title: "未收录" },
    ]);
    storageMock.getState.mockResolvedValue({
      revision: 3,
      data: [
        { id: "local-id", bangumiId: 352821 },
        { id: "no-bangumi" },
        { id: "another", bangumiId: 42 },
      ],
    });

    const response = await GET(request("?q=%20孤独摇滚%20"));

    expect(response.status).toBe(200);
    expect(clientMock.searchBangumiSubjects).toHaveBeenCalledWith("孤独摇滚");
    expect(storageMock.getState).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual([
      {
        ...result,
        alreadyAdded: true,
        localAnimeId: "local-id",
      },
      {
        ...result,
        bangumiId: 999,
        title: "未收录",
        alreadyAdded: false,
      },
    ]);
  });

  it.each([
    ["timeout", 504],
    ["rate_limit", 503],
    ["upstream", 502],
    ["invalid_response", 502],
  ] as const)("maps %s client errors to %i", async (kind, status) => {
    clientMock.searchBangumiSubjects.mockRejectedValue(
      new BangumiClientError(kind, "上游错误"),
    );

    const response = await GET(request("?q=孤独摇滚"));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: "上游错误" });
  });
});
