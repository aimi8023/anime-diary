import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BangumiClientError,
  clearBangumiCacheForTests,
  getBangumiPrefill,
  listSeasonSubjects,
  searchBangumiSubjects,
} from "./client";

const undiciMock = vi.hoisted(() => ({
  fetch: vi.fn(),
  ProxyAgent: class ProxyAgent {
    constructor(public readonly url: string) {}
  },
}));

vi.mock("undici", () => undiciMock);

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
    delete process.env.BANGUMI_PROXY;
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

  it("routes requests through BANGUMI_PROXY when configured", async () => {
    process.env.BANGUMI_PROXY = "http://127.0.0.1:7897";
    const globalFetch = vi.fn();
    vi.stubGlobal("fetch", globalFetch);
    undiciMock.fetch.mockResolvedValue(jsonResponse(searchPayload));

    await searchBangumiSubjects("孤独摇滚");

    expect(globalFetch).not.toHaveBeenCalled();
    expect(undiciMock.fetch).toHaveBeenCalledTimes(1);
    const options = undiciMock.fetch.mock.calls[0][1] as {
      dispatcher?: unknown;
    };
    expect(options.dispatcher).toBeInstanceOf(undiciMock.ProxyAgent);
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

  describe("listSeasonSubjects", () => {
    it("requests the broadcast window sorted by heat", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(searchPayload));
      vi.stubGlobal("fetch", fetchMock);

      const results = await listSeasonSubjects(2022, "秋");

      expect(results[0].title).toBe("孤独摇滚！");
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.bgm.tv/v0/search/subjects?limit=20&offset=0",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            keyword: "",
            sort: "heat",
            filter: {
              type: [2],
              nsfw: false,
              air_date: [">=2022-06-01", "<2022-09-01"],
            },
          }),
        }),
      );
    });

    it("starts the spring window at the previous December", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(searchPayload));
      vi.stubGlobal("fetch", fetchMock);

      await listSeasonSubjects(2024, "春");

      expect(fetchMock.mock.calls[0][1]?.body).toContain(
        '"air_date":[">=2023-12-01","<2024-03-01"]',
      );
    });

    const fullPage = Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      name: `番剧${index + 1}`,
    }));

    it("merges pages and stops at a short page", async () => {
      const shortPage = fullPage
        .slice(0, 5)
        .map((subject) => ({ ...subject, id: subject.id + 100 }));
      const fetchMock = vi.fn().mockImplementation((input: string) => {
        const url = String(input);
        if (url.includes("offset=0")) {
          return Promise.resolve(jsonResponse({ data: fullPage }));
        }
        if (url.includes("offset=20")) {
          return Promise.resolve(jsonResponse({ data: shortPage }));
        }
        return Promise.resolve(jsonResponse({ data: [] }));
      });
      vi.stubGlobal("fetch", fetchMock);

      const results = await listSeasonSubjects(2022, "秋");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(25);
      expect(results[0].bangumiId).toBe(1);
      expect(results[24].bangumiId).toBe(105);
    });

    it("caps season listings at five pages", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(jsonResponse({ data: fullPage })),
        );
      vi.stubGlobal("fetch", fetchMock);

      const results = await listSeasonSubjects(2022, "秋");

      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(results).toHaveLength(100);
    });

    it("caches season listings for five minutes", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() => Promise.resolve(jsonResponse(searchPayload)));
      vi.stubGlobal("fetch", fetchMock);

      await listSeasonSubjects(2022, "秋");
      await listSeasonSubjects(2022, "秋");
      expect(fetchMock).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      await listSeasonSubjects(2022, "秋");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("rejects malformed season listings", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: "wrong" })));

      await expect(listSeasonSubjects(2022, "秋")).rejects.toMatchObject({
        kind: "invalid_response",
      });
    });
  });
});
