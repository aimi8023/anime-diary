import { beforeEach, describe, expect, it, vi } from "vitest";
import { BangumiClientError } from "@/lib/bangumi/client";

const clientMock = vi.hoisted(() => ({
  listSeasonSubjects: vi.fn(),
}));
const storageMock = vi.hoisted(() => ({
  getState: vi.fn(),
}));

vi.mock("@/lib/bangumi/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bangumi/client")>();
  return { ...actual, listSeasonSubjects: clientMock.listSeasonSubjects };
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
  return new Request(`http://localhost/api/bangumi/season${query}`);
}

describe("GET /api/bangumi/season", () => {
  beforeEach(() => {
    clientMock.listSeasonSubjects.mockReset();
    storageMock.getState.mockReset();
  });

  it.each([
    ["missing year", "?season=秋"],
    ["non-numeric year", "?year=abc&season=秋"],
    ["year out of range", "?year=1899&season=秋"],
    ["missing season", "?year=2022"],
    ["unknown season", "?year=2022&season=雨"],
  ])("rejects invalid params: %s", async (_name, query) => {
    const response = await GET(request(query));
    expect(response.status).toBe(400);
    expect(clientMock.listSeasonSubjects).not.toHaveBeenCalled();
  });

  it("lists the season and decorates local duplicates with one state read", async () => {
    clientMock.listSeasonSubjects.mockResolvedValue([
      result,
      { ...result, bangumiId: 999, title: "未收录" },
    ]);
    storageMock.getState.mockResolvedValue({
      revision: 3,
      data: [{ id: "local-id", bangumiId: 352821 }],
    });

    const response = await GET(request("?year=2022&season=秋"));

    expect(response.status).toBe(200);
    expect(clientMock.listSeasonSubjects).toHaveBeenCalledWith(2022, "秋");
    expect(storageMock.getState).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual([
      { ...result, alreadyAdded: true, localAnimeId: "local-id" },
      { ...result, bangumiId: 999, title: "未收录", alreadyAdded: false },
    ]);
  });

  it.each([
    ["timeout", 504],
    ["rate_limit", 503],
    ["upstream", 502],
    ["invalid_response", 502],
  ] as const)("maps %s client errors to %i", async (kind, status) => {
    clientMock.listSeasonSubjects.mockRejectedValue(
      new BangumiClientError(kind, "上游错误"),
    );

    const response = await GET(request("?year=2022&season=秋"));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: "上游错误" });
  });
});
