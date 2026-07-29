import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BangumiClientError,
  clearBangumiCacheForTests,
  getBangumiPrefill,
  searchBangumiSubjects,
} from "./client";

const searchPayload = {
  total: 1,
  limit: 8,
  offset: 0,
  data: [
    {
      id: 352821,
      type: 2,
      name: "ぼっち・ざ・ろっく！",
      name_cn: "孤独摇滚！",
      date: "2022-10-09",
      eps: 12,
      images: {
        large: "https://lain.bgm.tv/large.jpg",
        common: "https://lain.bgm.tv/common.jpg",
        medium: "https://lain.bgm.tv/medium.jpg",
      },
    },
  ],
};

const detailPayload = {
  ...searchPayload.data[0],
  tags: [
    { name: "音乐", count: 200 },
    { name: "青春", count: 180 },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Bangumi client", () => {
  beforeEach(() => {
    clearBangumiCacheForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T00:00:00Z"));
    delete process.env.BANGUMI_ACCESS_TOKEN;
    delete process.env.BANGUMI_USER_AGENT;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.BANGUMI_ACCESS_TOKEN;
    delete process.env.BANGUMI_USER_AGENT;
  });

  it("searches only safe anime results and maps them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(searchPayload));
    vi.stubGlobal("fetch", fetchMock);
    process.env.BANGUMI_USER_AGENT = "tester/anime-diary";

    const results = await searchBangumiSubjects(" 孤独摇滚 ");

    expect(results).toEqual([
      {
        bangumiId: 352821,
        bangumiUrl: "https://bgm.tv/subject/352821",
        title: "孤独摇滚！",
        originalTitle: "ぼっち・ざ・ろっく！",
        cover: "https://lain.bgm.tv/large.jpg",
        airDate: "2022-10-09",
        episodes: 12,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bgm.tv/v0/search/subjects?limit=8&offset=0",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "tester/anime-diary",
        }),
        body: JSON.stringify({
          keyword: "孤独摇滚",
          sort: "match",
          filter: { type: [2], nsfw: false },
        }),
      }),
    );
  });

  it("keeps the optional access token on the server request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(searchPayload));
    vi.stubGlobal("fetch", fetchMock);
    process.env.BANGUMI_ACCESS_TOKEN = "secret-token";

    await searchBangumiSubjects("孤独摇滚");

    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer secret-token",
    });
  });

  it("does not send an authorization header without a token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(searchPayload));
    vi.stubGlobal("fetch", fetchMock);

    await searchBangumiSubjects("孤独摇滚");

    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty(
      "Authorization",
    );
  });

  it("caches successful search results for five minutes", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse(searchPayload)));
    vi.stubGlobal("fetch", fetchMock);

    const first = await searchBangumiSubjects("孤独摇滚");
    first[0].title = "mutated by caller";
    const second = await searchBangumiSubjects(" 孤独摇滚 ");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second[0].title).toBe("孤独摇滚！");

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    await searchBangumiSubjects("孤独摇滚");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps and caches detail results for one hour", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse(detailPayload)));
    vi.stubGlobal("fetch", fetchMock);

    const first = await getBangumiPrefill(352821);
    const second = await getBangumiPrefill(352821);

    expect(first.title).toBe("孤独摇滚！");
    expect(first.suggestedTags).toEqual(["音乐", "青春"]);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    await getBangumiPrefill(352821);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [404, "not_found"],
    [429, "rate_limit"],
    [500, "upstream"],
  ] as const)("maps HTTP %i to %s", async (status, kind) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ title: "error" }, status)),
    );

    await expect(getBangumiPrefill(352821)).rejects.toMatchObject({
      kind,
    });
  });

  it("maps aborted requests to a timeout error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(new DOMException("The operation was aborted", "AbortError")),
    );

    await expect(searchBangumiSubjects("孤独摇滚")).rejects.toMatchObject({
      kind: "timeout",
    });
  });

  it.each([
    ["search", () => searchBangumiSubjects("孤独摇滚"), { data: "wrong" }],
    ["detail", () => getBangumiPrefill(352821), { id: 352821 }],
  ])("rejects malformed %s responses", async (_name, action, payload) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(payload)));

    await expect(action()).rejects.toBeInstanceOf(BangumiClientError);
    await expect(action()).rejects.toMatchObject({ kind: "invalid_response" });
  });
});
